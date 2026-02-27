import type { RawClosedPosition, WinRateAnalysis } from '@/lib/types';

export function analyzeWinRate(closedPositions: RawClosedPosition[]): WinRateAnalysis {
  const total = closedPositions.length;
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

  const wins = closedPositions.filter((p) => p.realizedPnl > 0);
  const losses = closedPositions.filter((p) => p.realizedPnl <= 0);

  const winRate = wins.length / total;
  const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + p.realizedPnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, p) => s + p.realizedPnl, 0) / losses.length : 0;

  const { longestWinStreak, longestLossStreak } = calculateStreaks(closedPositions);

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
  positions: RawClosedPosition[]
): { longestWinStreak: number; longestLossStreak: number } {
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  for (const pos of positions) {
    if (pos.realizedPnl > 0) {
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
