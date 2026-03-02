import type { RawActivity } from '@/lib/types';
import type { HedgePair } from '@/lib/utils/hedge-pairs';
import type {
  ExecutionAnalysis,
  LegTimingCategory,
  LegTimingBucket,
  SizeBalancePoint,
  ExecutionTimelineEntry,
} from '@/lib/types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function categorizeLegTiming(gapSeconds: number): LegTimingCategory {
  if (gapSeconds === 0) return 'same-tx';
  if (gapSeconds < 10) return '<10s';
  if (gapSeconds < 30) return '10-30s';
  if (gapSeconds < 60) return '30s-1m';
  if (gapSeconds < 300) return '1-5m';
  return '5m+';
}

const LEG_TIMING_LABELS: Record<LegTimingCategory, string> = {
  'same-tx': 'Same TX',
  '<10s': '< 10s',
  '10-30s': '10–30s',
  '30s-1m': '30s–1m',
  '1-5m': '1–5m',
  '5m+': '5m+',
};

const LEG_TIMING_ORDER: LegTimingCategory[] = ['same-tx', '<10s', '10-30s', '30s-1m', '1-5m', '5m+'];

/**
 * Execution Analysis: "How does the bot execute trades?"
 * Analyzes transaction clustering, leg timing, order splitting, and size balance.
 */
export function analyzeExecution(
  pairs: HedgePair[],
  activities: RawActivity[]
): ExecutionAnalysis {
  if (pairs.length === 0) {
    return {
      sameTxRate: 0,
      legTimingDistribution: LEG_TIMING_ORDER.map((cat) => ({
        category: cat, label: LEG_TIMING_LABELS[cat], count: 0, percentage: 0,
      })),
      avgFillsPerLeg: 0,
      sizeBalance: [],
      recentTimelines: [],
    };
  }

  // Build txHash lookup for same-tx detection
  const buyTrades = activities.filter((a) => a.type === 'TRADE' && a.side === 'BUY');
  const txHashMap = new Map<string, RawActivity[]>();
  for (const t of buyTrades) {
    if (!txHashMap.has(t.transactionHash)) txHashMap.set(t.transactionHash, []);
    txHashMap.get(t.transactionHash)!.push(t);
  }

  // Same-tx detection: count pairs where YES and NO exist in same tx
  let sameTxCount = 0;
  const timingCategories: LegTimingCategory[] = [];

  for (const pair of pairs) {
    const yesTxHashes = new Set(pair.yesBuys.map((t) => t.transactionHash));
    const noTxHashes = new Set(pair.noBuys.map((t) => t.transactionHash));
    const hasOverlap = Array.from(yesTxHashes).some((h) => noTxHashes.has(h));

    if (hasOverlap) {
      sameTxCount++;
      timingCategories.push('same-tx');
    } else {
      const gapSeconds = Math.abs(pair.firstYesTimestamp - pair.firstNoTimestamp);
      timingCategories.push(categorizeLegTiming(gapSeconds));
    }
  }

  const sameTxRate = round4(sameTxCount / pairs.length);

  // Leg timing distribution
  const legTimingDistribution: LegTimingBucket[] = LEG_TIMING_ORDER.map((cat) => {
    const count = timingCategories.filter((c) => c === cat).length;
    return {
      category: cat,
      label: LEG_TIMING_LABELS[cat],
      count,
      percentage: round4(count / pairs.length),
    };
  });

  // Average fills per leg
  const totalFills = pairs.reduce((s, p) => s + p.yesBuys.length + p.noBuys.length, 0);
  const avgFillsPerLeg = round2(totalFills / (pairs.length * 2));

  // Size balance scatter
  const sizeBalance: SizeBalancePoint[] = pairs.map((p) => ({
    conditionId: p.conditionId,
    title: p.title,
    yesShares: p.yesSize,
    noShares: p.noSize,
    ratio: round4(Math.min(p.yesSize, p.noSize) / Math.max(p.yesSize, p.noSize)),
  }));

  // Recent 10 pair timelines
  const sortedByTime = [...pairs].sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  const recentTimelines: ExecutionTimelineEntry[] = sortedByTime.slice(0, 10).map((p) => {
    const fills = [
      ...p.yesBuys.map((t) => ({
        timestamp: t.timestamp,
        side: 'YES' as const,
        price: t.price,
        size: t.size,
        txHash: t.transactionHash,
      })),
      ...p.noBuys.map((t) => ({
        timestamp: t.timestamp,
        side: 'NO' as const,
        price: t.price,
        size: t.size,
        txHash: t.transactionHash,
      })),
    ].sort((a, b) => a.timestamp - b.timestamp);

    return { conditionId: p.conditionId, title: p.title, fills };
  });

  return {
    sameTxRate,
    legTimingDistribution,
    avgFillsPerLeg,
    sizeBalance,
    recentTimelines,
  };
}
