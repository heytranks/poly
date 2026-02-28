import type {
  RawActivity,
  RawPosition,
  PositionPnL,
  MarketPnL,
  AnalysisSummary,
} from '@/lib/types';
import { calculatePositionPnLs, aggregateMarketPnL, getClosedMarketPnLs } from '@/lib/utils/activity-pnl';
import { analyzePnl } from './pnl';
import { analyzeWinRate } from './win-rate';
import { analyzePairCost } from './pair-cost';
import { analyzeTiming } from './timing';
import { analyzeCategories } from './categories';
import { analyzeDirection } from './direction';
import { analyzeEntryPrice } from './entry-price';
import { analyzeHedging } from './hedge-analysis';
import { analyzeBotStrategy } from './bot-analysis';

export interface AnalysisContext {
  activities: RawActivity[];
  openPositions: RawPosition[];
  positionPnLs: PositionPnL[];
  marketPnLs: Map<string, MarketPnL>;
  closedMarkets: MarketPnL[];
}

export function buildAnalysisContext(
  activities: RawActivity[],
  openPositions: RawPosition[],
  marketOutcomes?: Map<string, number>
): AnalysisContext {
  const positionPnLs = calculatePositionPnLs(activities, openPositions, marketOutcomes);
  const marketPnLs = aggregateMarketPnL(positionPnLs);
  const closedMarkets = getClosedMarketPnLs(marketPnLs);

  return {
    activities,
    openPositions,
    positionPnLs,
    marketPnLs,
    closedMarkets,
  };
}

export function runFullAnalysis(
  activities: RawActivity[],
  openPositions: RawPosition[],
  marketOutcomes?: Map<string, number>
): AnalysisSummary {
  const ctx = buildAnalysisContext(activities, openPositions, marketOutcomes);

  const pnl = analyzePnl(ctx.positionPnLs, ctx.marketPnLs, ctx.openPositions);
  const winRate = analyzeWinRate(ctx.closedMarkets);
  const pairCost = analyzePairCost(ctx.activities);
  const timing = analyzeTiming(ctx.activities);
  const categories = analyzeCategories(ctx.activities);
  const direction = analyzeDirection(ctx.activities);
  const entryPrice = analyzeEntryPrice(ctx.activities);
  const hedgeAnalysis = analyzeHedging(ctx.activities, ctx.marketPnLs, pairCost);
  const botAnalysis = analyzeBotStrategy(ctx.activities);

  return {
    pnl,
    winRate,
    pairCost,
    timing,
    categories,
    direction,
    entryPrice,
    hedgeAnalysis,
    botAnalysis,
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
export { analyzeBotStrategy } from './bot-analysis';
