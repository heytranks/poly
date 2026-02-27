import type {
  RawTrade,
  RawClosedPosition,
  RawPosition,
  Trade,
  AnalysisSummary,
} from '@/lib/types';
import { analyzePnl } from './pnl';
import { analyzeWinRate } from './win-rate';
import { analyzePairCost } from './pair-cost';
import { analyzeTiming } from './timing';
import { analyzeCategories } from './categories';
import { analyzeDirection } from './direction';
import { analyzeEntryPrice } from './entry-price';
import { analyzeHedging } from './hedge-analysis';

export function transformTrades(rawTrades: RawTrade[]): Trade[] {
  return rawTrades.map((t) => ({
    id: t.transactionHash,
    side: t.side,
    asset: t.asset,
    size: t.size,
    price: t.price,
    cost: t.size * t.price,
    conditionId: t.conditionId,
    timestamp: new Date(t.timestamp * 1000),
    transactionHash: t.transactionHash,
    title: t.title,
    slug: t.slug,
    icon: t.icon,
    outcome: t.outcome,
    outcomeIndex: t.outcomeIndex,
  }));
}

export function runFullAnalysis(
  rawTrades: RawTrade[],
  closedPositions: RawClosedPosition[],
  openPositions: RawPosition[]
): AnalysisSummary {
  const trades = transformTrades(rawTrades);

  const pnl = analyzePnl(closedPositions, openPositions);
  const winRate = analyzeWinRate(closedPositions);
  const pairCost = analyzePairCost(trades);
  const timing = analyzeTiming(trades);
  const categories = analyzeCategories(trades, closedPositions);
  const direction = analyzeDirection(trades, closedPositions);
  const entryPrice = analyzeEntryPrice(trades, closedPositions);
  const hedgeAnalysis = analyzeHedging(trades, closedPositions, pairCost);

  return {
    pnl,
    winRate,
    pairCost,
    timing,
    categories,
    direction,
    entryPrice,
    hedgeAnalysis,
  };
}

export { analyzePnl } from './pnl';
export { analyzeWinRate } from './win-rate';
export { analyzePairCost } from './pair-cost';
export { analyzeTiming } from './timing';
export { analyzeCategories } from './categories';
export { analyzeDirection } from './direction';
export { analyzeEntryPrice } from './entry-price';
export { analyzeHedging } from './hedge-analysis';
