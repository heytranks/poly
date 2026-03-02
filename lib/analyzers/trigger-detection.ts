import type { HedgePair } from '@/lib/utils/hedge-pairs';
import type {
  StrategyProfitabilityAnalysis,
  PairCostHistogramBucket,
} from '@/lib/types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Strategy Profitability: "How profitable is the bot's hedging strategy?"
 * Analyzes pair cost distribution and win/loss breakdown.
 */
export function analyzeStrategyProfitability(pairs: HedgePair[]): StrategyProfitabilityAnalysis {
  if (pairs.length === 0) {
    return {
      histogram: [],
      avgPairCost: 0,
      profitableAvgMargin: 0,
      unprofitableAvgOvercost: 0,
      profitableRate: 0,
      totalPairs: 0,
      profitablePairs: 0,
      unprofitablePairs: 0,
      totalLockedProfit: 0,
      totalLoss: 0,
      netResult: 0,
    };
  }

  // Pair cost histogram with 0.01 unit buckets (0.80 to 1.05)
  const bucketMin = 0.80;
  const bucketMax = 1.05;
  const bucketStep = 0.01;
  const histogram: PairCostHistogramBucket[] = [];

  for (let min = bucketMin; min < bucketMax; min += bucketStep) {
    const max = round4(min + bucketStep);
    const rangeLabel = `${min.toFixed(2)}–${max.toFixed(2)}`;
    const count = pairs.filter((p) => p.pairCost >= min && p.pairCost < max).length;
    histogram.push({ range: rangeLabel, min: round4(min), max, count });
  }

  // Overflow buckets
  const belowCount = pairs.filter((p) => p.pairCost < bucketMin).length;
  if (belowCount > 0) {
    histogram.unshift({ range: `< ${bucketMin.toFixed(2)}`, min: 0, max: bucketMin, count: belowCount });
  }
  const aboveCount = pairs.filter((p) => p.pairCost >= bucketMax).length;
  if (aboveCount > 0) {
    histogram.push({ range: `≥ ${bucketMax.toFixed(2)}`, min: bucketMax, max: Infinity, count: aboveCount });
  }

  // Split into profitable / unprofitable
  const profitable = pairs.filter((p) => p.isProfitable);
  const unprofitable = pairs.filter((p) => !p.isProfitable);

  const avgPairCost = round4(pairs.reduce((s, p) => s + p.pairCost, 0) / pairs.length);

  const profitableAvgMargin = profitable.length > 0
    ? round4(profitable.reduce((s, p) => s + (1 - p.pairCost), 0) / profitable.length)
    : 0;

  const unprofitableAvgOvercost = unprofitable.length > 0
    ? round4(unprofitable.reduce((s, p) => s + (p.pairCost - 1), 0) / unprofitable.length)
    : 0;

  const totalLockedProfit = round2(profitable.reduce((s, p) => s + p.lockedProfit, 0));
  const totalLoss = round2(unprofitable.reduce((s, p) => s + p.hedgedSize * (p.pairCost - 1), 0));

  return {
    histogram,
    avgPairCost,
    profitableAvgMargin,
    unprofitableAvgOvercost,
    profitableRate: round4(profitable.length / pairs.length),
    totalPairs: pairs.length,
    profitablePairs: profitable.length,
    unprofitablePairs: unprofitable.length,
    totalLockedProfit,
    totalLoss,
    netResult: round2(totalLockedProfit - totalLoss),
  };
}
