import type {
  RawActivity,
  RawPosition,
  PositionPnL,
  MarketPnL,
  AnalysisSummary,
} from '@/lib/types';
import { calculatePositionPnLs, aggregateMarketPnL, getClosedMarketPnLs } from '@/lib/utils/activity-pnl';
import { getHedgePairs } from '@/lib/utils/hedge-pairs';
import { analyzePnl } from './pnl';
import { analyzeWinRate } from './win-rate';
import { analyzePairCost } from './pair-cost';
import { analyzeStrategyProfitability } from './trigger-detection';
import { analyzeExecution } from './execution-analysis';
import { analyzeMarketSelection } from './market-selection';
import { analyzePositionSizing } from './position-sizing';
import { analyzeProfitStructure } from './profit-structure';

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

  // Build shared hedge pairs for all new analyzers
  const hedgePairs = getHedgePairs(ctx.activities);

  const strategyProfitability = hedgePairs.length > 0
    ? analyzeStrategyProfitability(hedgePairs)
    : undefined;
  const execution = hedgePairs.length > 0
    ? analyzeExecution(hedgePairs, ctx.activities)
    : undefined;
  const marketSelection = hedgePairs.length > 0
    ? analyzeMarketSelection(hedgePairs)
    : undefined;
  const positionSizing = hedgePairs.length > 0
    ? analyzePositionSizing(hedgePairs)
    : undefined;
  const profitStructure = hedgePairs.length > 0
    ? analyzeProfitStructure(hedgePairs)
    : undefined;

  return {
    pnl,
    winRate,
    pairCost,
    strategyProfitability,
    execution,
    marketSelection,
    positionSizing,
    profitStructure,
    // priceContext is set separately in page.tsx (requires async API calls)
  };
}

export { analyzePnl } from './pnl';
export { analyzeWinRate } from './win-rate';
export { analyzePairCost } from './pair-cost';
export { analyzeStrategyProfitability } from './trigger-detection';
export { analyzeExecution } from './execution-analysis';
export { analyzeMarketSelection } from './market-selection';
export { analyzePositionSizing } from './position-sizing';
export { analyzeProfitStructure } from './profit-structure';
export { analyzePriceContext } from './price-context';
