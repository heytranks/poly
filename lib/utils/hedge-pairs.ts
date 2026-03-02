import type { RawActivity } from '@/lib/types';

// ============================================================
// Shared Hedge Pair Utility
// ============================================================

export interface HedgePair {
  conditionId: string;
  title: string;
  slug: string;
  yesBuys: RawActivity[];   // outcomeIndex=0 BUY trades
  noBuys: RawActivity[];    // outcomeIndex=1 BUY trades
  avgYesPrice: number;      // VWAP
  avgNoPrice: number;       // VWAP
  yesSize: number;          // total YES shares
  noSize: number;           // total NO shares
  hedgedSize: number;       // min(yesSize, noSize)
  pairCost: number;         // avgYesPrice + avgNoPrice
  lockedProfit: number;     // hedgedSize × max(0, 1 - pairCost)
  isProfitable: boolean;    // pairCost < 1.0
  capitalInvested: number;  // sum of all BUY usdcSize
  firstYesTimestamp: number;
  firstNoTimestamp: number;
  lastTimestamp: number;
  gapMinutes: number;       // |firstYes - firstNo| in minutes
}

function vwap(trades: RawActivity[]): number {
  const totalSize = trades.reduce((s, t) => s + t.size, 0);
  if (totalSize === 0) return 0;
  return trades.reduce((s, t) => s + t.price * t.size, 0) / totalSize;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Group BUY trades by conditionId, returning pairs with both YES and NO sides.
 * Each pair includes computed VWAP, sizes, pair cost, locked profit, and timing info.
 */
export function getHedgePairs(activities: RawActivity[]): HedgePair[] {
  const buyTrades = activities.filter((a) => a.type === 'TRADE' && a.side === 'BUY');
  const grouped = new Map<string, RawActivity[]>();

  for (const trade of buyTrades) {
    if (!grouped.has(trade.conditionId)) grouped.set(trade.conditionId, []);
    grouped.get(trade.conditionId)!.push(trade);
  }

  const pairs: HedgePair[] = [];

  for (const [conditionId, condTrades] of Array.from(grouped.entries())) {
    const yesBuys = condTrades.filter((t) => t.outcomeIndex === 0);
    const noBuys = condTrades.filter((t) => t.outcomeIndex === 1);
    if (yesBuys.length === 0 || noBuys.length === 0) continue;

    const avgYesPrice = round4(vwap(yesBuys));
    const avgNoPrice = round4(vwap(noBuys));
    const yesSize = round2(yesBuys.reduce((s, t) => s + t.size, 0));
    const noSize = round2(noBuys.reduce((s, t) => s + t.size, 0));
    const hedgedSize = round2(Math.min(yesSize, noSize));
    const pairCost = round4(avgYesPrice + avgNoPrice);
    const lockedProfit = round2(hedgedSize * Math.max(0, 1 - pairCost));
    const capitalInvested = round2(condTrades.reduce((s, t) => s + t.usdcSize, 0));

    const firstYesTimestamp = Math.min(...yesBuys.map((t) => t.timestamp));
    const firstNoTimestamp = Math.min(...noBuys.map((t) => t.timestamp));
    const lastTimestamp = Math.max(...condTrades.map((t) => t.timestamp));
    const gapMinutes = round2(Math.abs(firstYesTimestamp - firstNoTimestamp) / 60);

    pairs.push({
      conditionId,
      title: condTrades[0].title,
      slug: condTrades[0].slug,
      yesBuys,
      noBuys,
      avgYesPrice,
      avgNoPrice,
      yesSize,
      noSize,
      hedgedSize,
      pairCost,
      lockedProfit,
      isProfitable: pairCost < 1.0,
      capitalInvested,
      firstYesTimestamp,
      firstNoTimestamp,
      lastTimestamp,
      gapMinutes,
    });
  }

  // Sort by locked profit descending
  pairs.sort((a, b) => b.lockedProfit - a.lockedProfit);
  return pairs;
}
