import type { Trade, RawClosedPosition, DirectionAnalysis } from '@/lib/types';

export function analyzeDirection(
  trades: Trade[],
  closedPositions: RawClosedPosition[]
): DirectionAnalysis {
  const yesTrades = trades.filter((t) => t.outcome === 'Yes');
  const noTrades = trades.filter((t) => t.outcome === 'No');

  // PnL by direction from closed positions
  const yesPositions = closedPositions.filter((p) => p.outcome === 'Yes');
  const noPositions = closedPositions.filter((p) => p.outcome === 'No');

  const yesPnl = yesPositions.reduce((s, p) => s + p.realizedPnl, 0);
  const noPnl = noPositions.reduce((s, p) => s + p.realizedPnl, 0);

  const yesWins = yesPositions.filter((p) => p.realizedPnl > 0).length;
  const noWins = noPositions.filter((p) => p.realizedPnl > 0).length;

  const yesWinRate = yesPositions.length > 0 ? yesWins / yesPositions.length : 0;
  const noWinRate = noPositions.length > 0 ? noWins / noPositions.length : 0;

  const yesCount = yesTrades.length;
  const noCount = noTrades.length;
  const total = yesCount + noCount;

  let bias: 'YES' | 'NO' | 'NEUTRAL' = 'NEUTRAL';
  if (total > 0) {
    const yesRatio = yesCount / total;
    if (yesRatio > 0.6) bias = 'YES';
    else if (yesRatio < 0.4) bias = 'NO';
  }

  return {
    yesCount,
    noCount,
    yesPnl: Math.round(yesPnl * 100) / 100,
    noPnl: Math.round(noPnl * 100) / 100,
    yesWinRate,
    noWinRate,
    bias,
  };
}
