import type { RawPosition, PositionPnL, MarketPnL, PnlAnalysis, PnlDataPoint } from '@/lib/types';

export function analyzePnl(
  positionPnLs: PositionPnL[],
  marketPnLs: Map<string, MarketPnL>,
  openPositions: RawPosition[]
): PnlAnalysis {
  // Realized PnL from all market-level PnLs
  const realizedPnl = Array.from(marketPnLs.values()).reduce((sum, m) => sum + m.realizedPnl, 0);

  // Unrealized PnL from open positions
  const unrealizedPnl = openPositions.reduce((sum, p) => sum + p.cashPnl, 0);
  const totalPnl = realizedPnl + unrealizedPnl;

  // Per-market PnL for stats (closed markets only)
  const closedMarkets = Array.from(marketPnLs.values()).filter((m) => !m.isOpen);
  const marketPnls = closedMarkets.map((m) => m.realizedPnl);

  const maxSingleWin = marketPnls.length ? Math.max(...marketPnls, 0) : 0;
  const maxSingleLoss = marketPnls.length ? Math.min(...marketPnls, 0) : 0;

  const totalGains = marketPnls.filter((p) => p > 0).reduce((s, p) => s + p, 0);
  const totalLosses = Math.abs(marketPnls.filter((p) => p < 0).reduce((s, p) => s + p, 0));
  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? Infinity : 0;

  // Cumulative PnL series based on lastActivityTime
  const cumulativePnlSeries = buildCumulativePnl(closedMarkets);

  // Average position size per market (total USDC invested per conditionId)
  const marketInvestment = new Map<string, number>();
  for (const p of positionPnLs) {
    if (p.outcomeIndex === 999 || p.totalBought === 0) continue;
    marketInvestment.set(p.conditionId, (marketInvestment.get(p.conditionId) ?? 0) + p.totalBought);
  }
  const marketInvestments = Array.from(marketInvestment.values());
  const avgPositionSize = marketInvestments.length > 0
    ? marketInvestments.reduce((s, v) => s + v, 0) / marketInvestments.length
    : 0;

  return {
    realizedPnl: round2(realizedPnl),
    unrealizedPnl: round2(unrealizedPnl),
    totalPnl: round2(totalPnl),
    cumulativePnlSeries,
    maxSingleWin: round2(maxSingleWin),
    maxSingleLoss: round2(maxSingleLoss),
    profitFactor: round2(profitFactor),
    avgPositionSize: round2(avgPositionSize),
  };
}

function buildCumulativePnl(closedMarkets: MarketPnL[]): PnlDataPoint[] {
  if (!closedMarkets.length) return [];

  // Sort by lastActivityTime ascending
  const sorted = [...closedMarkets].sort(
    (a, b) => a.lastActivityTime.getTime() - b.lastActivityTime.getTime()
  );

  // Group by date
  const dailyMap = new Map<string, number>();
  for (const market of sorted) {
    const dateKey = market.lastActivityTime.toISOString().split('T')[0];
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + market.realizedPnl);
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
