import type { HedgePair } from '@/lib/utils/hedge-pairs';
import type {
  ProfitStructureAnalysis,
  ProfitHistogramBucket,
  MarginHistogramBucket,
  CumulativeEfficiencyPoint,
  CostBreakdownEntry,
} from '@/lib/types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Profit Structure: "What is the bot's revenue model and efficiency?"
 * Analyzes profit distribution, margin targets, capital efficiency, and cost breakdown.
 */
export function analyzeProfitStructure(pairs: HedgePair[]): ProfitStructureAnalysis {
  if (pairs.length === 0) {
    return {
      profitHistogram: [],
      marginHistogram: [],
      cumulativeEfficiency: [],
      topPairsCostBreakdown: [],
      totalLockedProfit: 0,
      avgMargin: 0,
      capitalEfficiency: 0,
      profitFactor: 0,
    };
  }

  // Profit histogram
  const profits = pairs.map((p) => p.lockedProfit);
  const maxProfit = Math.max(...profits);
  const profitBucketWidth = Math.max(0.5, Math.ceil(maxProfit / 15 * 2) / 2); // ~15 buckets
  const profitHistogram: ProfitHistogramBucket[] = [];
  for (let min = 0; min <= maxProfit + profitBucketWidth; min += profitBucketWidth) {
    const max = round2(min + profitBucketWidth);
    const count = profits.filter((p) => p >= min && p < max).length;
    if (count > 0) {
      profitHistogram.push({
        range: `$${min.toFixed(2)}–$${max.toFixed(2)}`,
        min: round2(min),
        max,
        count,
      });
    }
  }

  // Margin histogram (1 - pairCost), 0.01 unit buckets
  const margins = pairs.map((p) => round4(1 - p.pairCost));
  const marginHistogram: MarginHistogramBucket[] = [];
  for (let min = -0.10; min <= 0.25; min = round4(min + 0.01)) {
    const max = round4(min + 0.01);
    const count = margins.filter((m) => m >= min && m < max).length;
    if (count > 0) {
      marginHistogram.push({
        range: `${(min * 100).toFixed(0)}–${(max * 100).toFixed(0)}%`,
        min,
        max,
        count,
      });
    }
  }

  // Cumulative capital efficiency over time
  const sortedPairs = [...pairs].sort(
    (a, b) => Math.min(a.firstYesTimestamp, a.firstNoTimestamp) - Math.min(b.firstYesTimestamp, b.firstNoTimestamp)
  );

  let cumProfit = 0;
  let cumCapital = 0;
  const cumulativeEfficiency: CumulativeEfficiencyPoint[] = sortedPairs.map((p) => {
    cumProfit += p.lockedProfit;
    cumCapital += p.capitalInvested;
    const ts = Math.min(p.firstYesTimestamp, p.firstNoTimestamp);
    const d = new Date(ts * 1000);
    return {
      timestamp: ts,
      date: d.toISOString().split('T')[0],
      cumulativeProfit: round2(cumProfit),
      cumulativeCapital: round2(cumCapital),
      efficiency: cumCapital > 0 ? round4(cumProfit / cumCapital) : 0,
    };
  });

  // Top 20 pairs cost breakdown (stacked bar data)
  const topPairsCostBreakdown: CostBreakdownEntry[] = pairs
    .slice(0, 20)
    .map((p) => ({
      conditionId: p.conditionId,
      title: p.title,
      avgYesPrice: p.avgYesPrice,
      avgNoPrice: p.avgNoPrice,
      pairCost: p.pairCost,
      lockedProfit: p.lockedProfit,
    }));

  // Summary stats
  const totalLockedProfit = round2(pairs.reduce((s, p) => s + p.lockedProfit, 0));
  const totalCapital = pairs.reduce((s, p) => s + p.capitalInvested, 0);
  const avgMargin = round4(margins.reduce((a, b) => a + b, 0) / margins.length);
  const capitalEfficiency = totalCapital > 0 ? round4(totalLockedProfit / totalCapital) : 0;

  // Profit factor: gross profit / gross loss
  const grossProfit = pairs.filter((p) => p.isProfitable).reduce((s, p) => s + p.lockedProfit, 0);
  const grossLoss = pairs.filter((p) => !p.isProfitable).reduce((s, p) => s + Math.abs(p.hedgedSize * (p.pairCost - 1)), 0);
  const profitFactor = grossLoss > 0 ? round2(grossProfit / grossLoss) : grossProfit > 0 ? Infinity : 0;

  return {
    profitHistogram,
    marginHistogram,
    cumulativeEfficiency,
    topPairsCostBreakdown,
    totalLockedProfit,
    avgMargin,
    capitalEfficiency,
    profitFactor,
  };
}
