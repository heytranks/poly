import type { RawActivity, RawPosition, PositionPnL, MarketPnL } from '@/lib/types';

/**
 * PnL Calculation Rules:
 * - TRADE BUY:  -usdcSize (cash outflow)
 * - TRADE SELL: +usdcSize (cash inflow)
 * - SPLIT:      -usdcSize (cash outflow, buying outcome tokens)
 * - MERGE:      +usdcSize (cash inflow, returning outcome tokens)
 * - REDEEM:     +usdcSize (cash inflow, position settlement)
 */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

interface PositionAccumulator {
  conditionId: string;
  outcomeIndex: number;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  totalBought: number;      // USDC spent
  totalSold: number;        // USDC received
  sharesBought: number;     // for VWAP calculation
  firstActivityTime: number;
  lastActivityTime: number;
}

/**
 * Calculate position-level PnL from activities
 * Groups by (conditionId, outcomeIndex) to get per-outcome position PnL
 *
 * @param marketOutcomes - Map<slug, winningOutcomeIndex> from Gamma API.
 *   If provided, positions with no REDEEM/SELL that are NOT open will be
 *   resolved: won → totalSold = sharesBought, lost → totalSold = 0.
 */
export function calculatePositionPnLs(
  activities: RawActivity[],
  openPositions: RawPosition[],
  marketOutcomes?: Map<string, number>
): PositionPnL[] {
  // Create a map of open position sizes by (conditionId, outcomeIndex)
  const openSizeMap = new Map<string, number>();
  for (const pos of openPositions) {
    const key = `${pos.conditionId}:${pos.outcomeIndex}`;
    openSizeMap.set(key, pos.size);
  }

  // Accumulate by (conditionId, outcomeIndex)
  const accumulators = new Map<string, PositionAccumulator>();

  for (const activity of activities) {
    // SPLIT/MERGE have outcomeIndex=999 or undefined, handle at market level
    // For now, we handle them separately
    if (activity.type === 'SPLIT' || activity.type === 'MERGE') {
      // SPLIT/MERGE affect all outcomes equally; we'll handle in aggregateMarketPnL
      // For position-level, skip or attribute to a special outcome
      const key = `${activity.conditionId}:999`;
      const acc = accumulators.get(key) ?? {
        conditionId: activity.conditionId,
        outcomeIndex: 999,
        title: activity.title,
        slug: activity.slug,
        icon: activity.icon,
        outcome: 'SPLIT/MERGE',
        totalBought: 0,
        totalSold: 0,
        sharesBought: 0,
        firstActivityTime: activity.timestamp,
        lastActivityTime: activity.timestamp,
      };

      if (activity.type === 'SPLIT') {
        acc.totalBought += activity.usdcSize;
      } else {
        acc.totalSold += activity.usdcSize;
      }

      acc.firstActivityTime = Math.min(acc.firstActivityTime, activity.timestamp);
      acc.lastActivityTime = Math.max(acc.lastActivityTime, activity.timestamp);
      accumulators.set(key, acc);
      continue;
    }

    // Handle TRADE and REDEEM by outcome
    const key = `${activity.conditionId}:${activity.outcomeIndex}`;
    const acc = accumulators.get(key) ?? {
      conditionId: activity.conditionId,
      outcomeIndex: activity.outcomeIndex,
      title: activity.title,
      slug: activity.slug,
      icon: activity.icon,
      outcome: activity.outcome,
      totalBought: 0,
      totalSold: 0,
      sharesBought: 0,
      firstActivityTime: activity.timestamp,
      lastActivityTime: activity.timestamp,
    };

    if (activity.type === 'TRADE') {
      if (activity.side === 'BUY') {
        acc.totalBought += activity.usdcSize;
        acc.sharesBought += activity.size;
      } else if (activity.side === 'SELL') {
        acc.totalSold += activity.usdcSize;
      }
    } else if (activity.type === 'REDEEM') {
      // REDEEM is a settlement - cash inflow
      acc.totalSold += activity.usdcSize;
    }

    acc.firstActivityTime = Math.min(acc.firstActivityTime, activity.timestamp);
    acc.lastActivityTime = Math.max(acc.lastActivityTime, activity.timestamp);
    accumulators.set(key, acc);
  }

  // Convert to PositionPnL array
  const results: PositionPnL[] = [];

  for (const [key, acc] of Array.from(accumulators.entries())) {
    const openSize = openSizeMap.get(key) ?? 0;
    const isOpen = openSize > 0;
    const realizedPnl = acc.totalSold - acc.totalBought;
    const avgBuyPrice = acc.sharesBought > 0 ? acc.totalBought / acc.sharesBought : 0;

    results.push({
      conditionId: acc.conditionId,
      title: acc.title,
      slug: acc.slug,
      icon: acc.icon,
      outcome: acc.outcome,
      outcomeIndex: acc.outcomeIndex,
      totalBought: round2(acc.totalBought),
      totalSold: round2(acc.totalSold),
      realizedPnl: round2(realizedPnl),
      avgBuyPrice: round4(avgBuyPrice),
      isOpen,
      firstActivityTime: new Date(acc.firstActivityTime * 1000),
      lastActivityTime: new Date(acc.lastActivityTime * 1000),
    });
  }

  // Resolve positions using market outcomes
  // Handles both: (1) closed positions with no REDEEM, (2) open positions in resolved markets
  if (marketOutcomes && marketOutcomes.size > 0) {
    for (const pos of results) {
      // Skip SPLIT/MERGE or positions that already have sell data (REDEEM/SELL)
      if (pos.outcomeIndex === 999 || pos.totalSold > 0) continue;
      if (pos.totalBought === 0) continue;

      const winnerIdx = marketOutcomes.get(pos.slug);
      if (winnerIdx === undefined || winnerIdx === -1) continue; // not resolved or not found

      const acc = accumulators.get(`${pos.conditionId}:${pos.outcomeIndex}`);
      if (!acc) continue;

      if (pos.outcomeIndex === winnerIdx) {
        pos.totalSold = round2(acc.sharesBought);
      } else {
        pos.totalSold = 0;
      }
      pos.realizedPnl = round2(pos.totalSold - pos.totalBought);
      pos.isOpen = false;
    }
  }

  // Sort by lastActivityTime descending
  results.sort((a, b) => b.lastActivityTime.getTime() - a.lastActivityTime.getTime());

  return results;
}

/**
 * Aggregate position PnLs to market level (summing all outcomes for each conditionId)
 */
export function aggregateMarketPnL(positions: PositionPnL[]): Map<string, MarketPnL> {
  const marketMap = new Map<string, MarketPnL>();

  for (const pos of positions) {
    const existing = marketMap.get(pos.conditionId);

    if (existing) {
      existing.realizedPnl += pos.realizedPnl;
      existing.isOpen = existing.isOpen || pos.isOpen;
      existing.positionCount++;
      if (pos.firstActivityTime < existing.firstActivityTime) {
        existing.firstActivityTime = pos.firstActivityTime;
      }
      if (pos.lastActivityTime > existing.lastActivityTime) {
        existing.lastActivityTime = pos.lastActivityTime;
      }
    } else {
      marketMap.set(pos.conditionId, {
        conditionId: pos.conditionId,
        title: pos.title,
        slug: pos.slug,
        icon: pos.icon,
        realizedPnl: pos.realizedPnl,
        isOpen: pos.isOpen,
        positionCount: 1,
        firstActivityTime: pos.firstActivityTime,
        lastActivityTime: pos.lastActivityTime,
      });
    }
  }

  // Round the aggregated PnL
  for (const market of Array.from(marketMap.values())) {
    market.realizedPnl = round2(market.realizedPnl);
  }

  return marketMap;
}

/**
 * Get closed position PnLs only (for win rate calculation)
 */
export function getClosedPositionPnLs(positions: PositionPnL[]): PositionPnL[] {
  return positions.filter((p) => !p.isOpen && p.outcomeIndex !== 999);
}

/**
 * Get closed market PnLs (markets where all positions are closed)
 */
export function getClosedMarketPnLs(marketMap: Map<string, MarketPnL>): MarketPnL[] {
  return Array.from(marketMap.values()).filter((m) => !m.isOpen);
}

/**
 * Extract trade-like activities for timing and hedge analysis
 * Returns activities that represent actual trades (BUY/SELL)
 */
export function getTradeActivities(activities: RawActivity[]): RawActivity[] {
  return activities.filter(
    (a) => a.type === 'TRADE' && (a.side === 'BUY' || a.side === 'SELL')
  );
}
