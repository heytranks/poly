import type { HedgePair } from '@/lib/utils/hedge-pairs';
import type {
  PositionSizingAnalysis,
  SizingHistogramBucket,
  SizeVsCostPoint,
  WeeklySizePoint,
} from '@/lib/types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr: number[], mean: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let sumNum = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sumNum += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }
  const denom = Math.sqrt(sumX2 * sumY2);
  return denom > 0 ? round4(sumNum / denom) : 0;
}

/**
 * Position Sizing: "How does the bot determine position size?"
 * Analyzes capital distribution, consistency, correlation with spread, and trends.
 */
export function analyzePositionSizing(pairs: HedgePair[]): PositionSizingAnalysis {
  if (pairs.length === 0) {
    return {
      histogram: [],
      mean: 0,
      median: 0,
      stdDev: 0,
      cv: 0,
      sizeVsCost: [],
      correlation: 0,
      weeklyTrend: [],
      roundNumberMode: null,
      roundNumberRate: 0,
    };
  }

  const sizes = pairs.map((p) => p.capitalInvested);
  const meanSize = round2(sizes.reduce((a, b) => a + b, 0) / sizes.length);
  const medianSize = round2(median(sizes));
  const sd = round2(stdDev(sizes, meanSize));
  const cv = meanSize > 0 ? round4(sd / meanSize) : 0;

  // Histogram with adaptive buckets
  const maxSize = Math.max(...sizes);
  const bucketWidth = Math.max(1, Math.ceil(maxSize / 20)); // ~20 buckets
  const histogram: SizingHistogramBucket[] = [];
  for (let min = 0; min < maxSize + bucketWidth; min += bucketWidth) {
    const max = min + bucketWidth;
    const count = sizes.filter((s) => s >= min && s < max).length;
    if (count > 0) {
      histogram.push({
        range: `$${min}–$${max}`,
        min,
        max,
        count,
      });
    }
  }

  // Size vs pair cost scatter
  const sizeVsCost: SizeVsCostPoint[] = pairs.map((p) => ({
    conditionId: p.conditionId,
    title: p.title,
    capitalInvested: p.capitalInvested,
    pairCost: p.pairCost,
  }));

  const correlation = pearsonCorrelation(
    pairs.map((p) => p.capitalInvested),
    pairs.map((p) => p.pairCost)
  );

  // Weekly size trend
  const weekMap = new Map<string, { total: number; count: number }>();
  for (const pair of pairs) {
    const ts = Math.min(pair.firstYesTimestamp, pair.firstNoTimestamp);
    const d = new Date(ts * 1000);
    // ISO week label
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const label = weekStart.toISOString().split('T')[0];
    const entry = weekMap.get(label) ?? { total: 0, count: 0 };
    entry.total += pair.capitalInvested;
    entry.count++;
    weekMap.set(label, entry);
  }

  const weeklyTrend: WeeklySizePoint[] = Array.from(weekMap.entries())
    .map(([weekLabel, data]) => ({
      weekLabel,
      avgSize: round2(data.total / data.count),
      count: data.count,
    }))
    .sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));

  // Round number detection
  // Check for common round sizes in shares (YES/NO sizes)
  const allSizes = pairs.flatMap((p) => [p.yesSize, p.noSize]);
  const roundedSizes = allSizes.map((s) => Math.round(s));
  const freq = new Map<number, number>();
  for (const s of roundedSizes) {
    freq.set(s, (freq.get(s) ?? 0) + 1);
  }
  let roundNumberMode: number | null = null;
  let maxFreq = 0;
  for (const [val, count] of Array.from(freq.entries())) {
    if (count > maxFreq) {
      maxFreq = count;
      roundNumberMode = val;
    }
  }
  const roundNumberRate = allSizes.length > 0
    ? round4(allSizes.filter((s) => Math.abs(s - Math.round(s)) < 0.01).length / allSizes.length)
    : 0;

  return {
    histogram,
    mean: meanSize,
    median: medianSize,
    stdDev: sd,
    cv,
    sizeVsCost,
    correlation,
    weeklyTrend,
    roundNumberMode,
    roundNumberRate,
  };
}
