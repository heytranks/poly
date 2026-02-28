import type { MarketPnL, WinRateAnalysis } from '@/lib/types';

export function analyzeWinRate(closedMarkets: MarketPnL[]): WinRateAnalysis {
  const total = closedMarkets.length;
  if (total === 0) {
    return {
      totalClosed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      expectancy: 0,
    };
  }

  const wins = closedMarkets.filter((m) => m.realizedPnl > 0);
  const losses = closedMarkets.filter((m) => m.realizedPnl <= 0);

  const winRate = wins.length / total;
  const avgWin = wins.length > 0 ? wins.reduce((s, m) => s + m.realizedPnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, m) => s + m.realizedPnl, 0) / losses.length : 0;

  // Sort by lastActivityTime for streak calculation
  const sorted = [...closedMarkets].sort(
    (a, b) => a.lastActivityTime.getTime() - b.lastActivityTime.getTime()
  );
  const { longestWinStreak, longestLossStreak } = calculateStreaks(sorted);

  const expectancy = winRate * avgWin + (1 - winRate) * avgLoss;

  return {
    totalClosed: total,
    wins: wins.length,
    losses: losses.length,
    winRate,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    longestWinStreak,
    longestLossStreak,
    expectancy: Math.round(expectancy * 100) / 100,
  };
}

function calculateStreaks(
  markets: MarketPnL[]
): { longestWinStreak: number; longestLossStreak: number } {
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  for (const market of markets) {
    if (market.realizedPnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    }
  }

  return { longestWinStreak, longestLossStreak };
}
