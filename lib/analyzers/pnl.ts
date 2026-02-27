import type { RawClosedPosition, RawPosition, PnlAnalysis, PnlDataPoint } from '@/lib/types';

export function analyzePnl(
  closedPositions: RawClosedPosition[],
  openPositions: RawPosition[],
): PnlAnalysis {
  const realizedPnl = closedPositions.reduce((sum, p) => sum + p.realizedPnl, 0);
  const unrealizedPnl = openPositions.reduce((sum, p) => sum + p.cashPnl, 0);
  const totalPnl = realizedPnl + unrealizedPnl;

  const positionPnls = closedPositions.map((p) => p.realizedPnl);
  const maxSingleWin = positionPnls.length ? Math.max(...positionPnls, 0) : 0;
  const maxSingleLoss = positionPnls.length ? Math.min(...positionPnls, 0) : 0;

  const totalGains = positionPnls.filter((p) => p > 0).reduce((s, p) => s + p, 0);
  const totalLosses = Math.abs(positionPnls.filter((p) => p < 0).reduce((s, p) => s + p, 0));
  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? Infinity : 0;

  // Cumulative PnL: closed positions 시간순 누적
  const cumulativePnlSeries = buildCumulativePnl(closedPositions);

  return {
    realizedPnl: round2(realizedPnl),
    unrealizedPnl: round2(unrealizedPnl),
    totalPnl: round2(totalPnl),
    cumulativePnlSeries,
    maxSingleWin: round2(maxSingleWin),
    maxSingleLoss: round2(maxSingleLoss),
    profitFactor: round2(profitFactor),
  };
}

function buildCumulativePnl(closedPositions: RawClosedPosition[]): PnlDataPoint[] {
  if (!closedPositions.length) return [];

  // timestamp 기준 오름차순 정렬
  const sorted = [...closedPositions].sort((a, b) => a.timestamp - b.timestamp);

  // 일별 그룹핑
  const dailyMap = new Map<string, number>();
  for (const pos of sorted) {
    const dateKey = new Date(pos.timestamp * 1000).toISOString().split('T')[0];
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + pos.realizedPnl);
  }

  const series: PnlDataPoint[] = [];
  let cumulative = 0;

  for (const [date, dayPnl] of Array.from(dailyMap.entries())) {
    cumulative += dayPnl;
    series.push({
      date,
      cumulativePnl: round2(cumulative),
      tradePnl: round2(dayPnl),
    });
  }

  return series;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
