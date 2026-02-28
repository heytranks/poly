import type { RawActivity, DirectionAnalysis } from '@/lib/types';

export function analyzeDirection(activities: RawActivity[]): DirectionAnalysis {
  const trades = activities.filter((a) => a.type === 'TRADE');

  const yesTrades = trades.filter((t) => t.outcomeIndex === 0);
  const noTrades = trades.filter((t) => t.outcomeIndex === 1);

  const yesCount = yesTrades.length;
  const noCount = noTrades.length;
  const yesVolume = yesTrades.reduce((s, t) => s + t.usdcSize, 0);
  const noVolume = noTrades.reduce((s, t) => s + t.usdcSize, 0);

  const yesBuys = yesTrades.filter((t) => t.side === 'BUY');
  const noBuys = noTrades.filter((t) => t.side === 'BUY');
  const avgYesPrice = yesBuys.length > 0
    ? yesBuys.reduce((s, t) => s + t.price, 0) / yesBuys.length
    : 0;
  const avgNoPrice = noBuys.length > 0
    ? noBuys.reduce((s, t) => s + t.price, 0) / noBuys.length
    : 0;

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
    yesVolume: round2(yesVolume),
    noVolume: round2(noVolume),
    avgYesPrice: round4(avgYesPrice),
    avgNoPrice: round4(avgNoPrice),
    bias,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
