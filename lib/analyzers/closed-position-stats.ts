import type { RawClosedPosition, WinRateAnalysis } from '@/lib/types';

interface MarketAgg {
  conditionId: string;
  realizedPnl: number;
  totalBought: number;
  timestamp: number; // latest timestamp among positions
}

/**
 * Analyze closed positions (from closed-positions API) for summary card stats.
 * Groups by conditionId → market-level win/loss, streaks, avgPositionSize, etc.
 *
 * This is more accurate than activity-based stats because:
 * - closed-positions API returns ALL closed positions (not limited to ~10k activities)
 * - Each position has realizedPnl and totalBought directly from Polymarket
 */
export function analyzeClosedPositionStats(closedPositions: RawClosedPosition[]): {
  winRate: WinRateAnalysis;
  maxSingleWin: number;
  maxSingleLoss: number;
  avgPositionSize: number;
} {
  // Group by conditionId → aggregate per market
  const marketMap = new Map<string, MarketAgg>();

  for (const cp of closedPositions) {
    const existing = marketMap.get(cp.conditionId);
    if (existing) {
      existing.realizedPnl += cp.realizedPnl;
      existing.totalBought += cp.totalBought;
      existing.timestamp = Math.max(existing.timestamp, cp.timestamp);
    } else {
      marketMap.set(cp.conditionId, {
        conditionId: cp.conditionId,
        realizedPnl: cp.realizedPnl,
        totalBought: cp.totalBought,
        timestamp: cp.timestamp,
      });
    }
  }

  const markets = Array.from(marketMap.values());
  const total = markets.length;

  if (total === 0) {
    return {
      winRate: {
        totalClosed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        expectancy: 0,
      },
      maxSingleWin: 0,
      maxSingleLoss: 0,
      avgPositionSize: 0,
    };
  }

  const wins = markets.filter((m) => m.realizedPnl > 0);
  const losses = markets.filter((m) => m.realizedPnl <= 0);

  const winRate = wins.length / total;
  const avgWin = wins.length > 0 ? wins.reduce((s, m) => s + m.realizedPnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, m) => s + m.realizedPnl, 0) / losses.length : 0;
  const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;

  // Max single win/loss at market level
  const pnls = markets.map((m) => m.realizedPnl);
  const maxSingleWin = Math.max(...pnls, 0);
  const maxSingleLoss = Math.min(...pnls, 0);

  // Average position size (totalBought per market)
  const investments = markets.map((m) => m.totalBought).filter((v) => v > 0);
  const avgPositionSize = investments.length > 0
    ? investments.reduce((s, v) => s + v, 0) / investments.length
    : 0;

  // Sort by timestamp ascending for streak calculation
  const sorted = [...markets].sort((a, b) => a.timestamp - b.timestamp);
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const m of sorted) {
    if (m.realizedPnl > 0) {
      curWin++;
      curLoss = 0;
      longestWinStreak = Math.max(longestWinStreak, curWin);
    } else {
      curLoss++;
      curWin = 0;
      longestLossStreak = Math.max(longestLossStreak, curLoss);
    }
  }

  return {
    winRate: {
      totalClosed: total,
      wins: wins.length,
      losses: losses.length,
      winRate,
      avgWin: round2(avgWin),
      avgLoss: round2(avgLoss),
      longestWinStreak,
      longestLossStreak,
      expectancy: round2(expectancy),
    },
    maxSingleWin: round2(maxSingleWin),
    maxSingleLoss: round2(maxSingleLoss),
    avgPositionSize: round2(avgPositionSize),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
