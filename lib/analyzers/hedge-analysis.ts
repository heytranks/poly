import type {
  Trade,
  RawClosedPosition,
  PairCostAnalysis,
  PairCostResult,
  HedgeTimingResult,
  HedgeTimingCategory,
  HedgeTimingBucket,
  HedgeTimingAnalysis,
  HedgeEfficiencyResult,
  PairCostBucket,
  HedgeEfficiencyAnalysis,
  MarketGroupStats,
  MarketSelectionAnalysis,
  LegEntryPair,
  PriceBucketCount,
  LegEntryAnalysis,
  SpreadScatterPoint,
  SpreadPatternAnalysis,
  TimePricePair,
  TimePriceBucket,
  TimePriceAnalysis,
  HedgeAnalysis,
} from '@/lib/types';

// ============================================================
// Shared helpers
// ============================================================

function categorizeGap(minutes: number): HedgeTimingCategory {
  if (minutes < 5) return 'simultaneous';
  if (minutes < 60) return 'quick';
  if (minutes < 1440) return 'gradual';
  return 'delayed';
}

const CATEGORY_LABELS: Record<HedgeTimingCategory, string> = {
  simultaneous: '< 5 min',
  quick: '5 min – 1 hr',
  gradual: '1 – 24 hr',
  delayed: '> 24 hr',
};

const CATEGORY_ORDER: HedgeTimingCategory[] = ['simultaneous', 'quick', 'gradual', 'delayed'];

interface HedgePairData {
  conditionId: string;
  title: string;
  slug: string;
  yesTrades: Trade[];
  noTrades: Trade[];
}

/** BUY 트레이드를 conditionId별로 그룹, 양쪽 다 있는 것만 반환 */
function getHedgePairs(trades: Trade[]): HedgePairData[] {
  const buyTrades = trades.filter((t) => t.side === 'BUY');
  const grouped = new Map<string, Trade[]>();
  for (const trade of buyTrades) {
    if (!grouped.has(trade.conditionId)) grouped.set(trade.conditionId, []);
    grouped.get(trade.conditionId)!.push(trade);
  }

  const pairs: HedgePairData[] = [];
  for (const [conditionId, condTrades] of Array.from(grouped.entries())) {
    const yesTrades = condTrades.filter((t: Trade) => t.outcomeIndex === 0);
    const noTrades = condTrades.filter((t: Trade) => t.outcomeIndex === 1);
    if (yesTrades.length === 0 || noTrades.length === 0) continue;
    pairs.push({ conditionId, title: condTrades[0].title, slug: condTrades[0].slug, yesTrades, noTrades });
  }
  return pairs;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

function vwap(trades: Trade[]): number {
  const totalSize = trades.reduce((s, t) => s + t.size, 0);
  if (totalSize === 0) return 0;
  return trades.reduce((s, t) => s + t.price * t.size, 0) / totalSize;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ============================================================
// 1. Hedge Timing Analysis
// ============================================================

function analyzeHedgeTiming(hedgePairs: HedgePairData[]): HedgeTimingAnalysis {
  const pairs: HedgeTimingResult[] = hedgePairs.map((hp) => {
    const firstYesBuy = hp.yesTrades.reduce((e: Trade, t: Trade) =>
      t.timestamp < e.timestamp ? t : e
    );
    const firstNoBuy = hp.noTrades.reduce((e: Trade, t: Trade) =>
      t.timestamp < e.timestamp ? t : e
    );

    const gapMs = Math.abs(firstYesBuy.timestamp.getTime() - firstNoBuy.timestamp.getTime());
    const gapMinutes = gapMs / (1000 * 60);
    const firstLeg: 'YES' | 'NO' = firstYesBuy.timestamp <= firstNoBuy.timestamp ? 'YES' : 'NO';

    return {
      conditionId: hp.conditionId,
      title: hp.title,
      slug: hp.slug,
      firstYesBuy: firstYesBuy.timestamp,
      firstNoBuy: firstNoBuy.timestamp,
      gapMinutes: round2(gapMinutes),
      category: categorizeGap(gapMinutes),
      firstLeg,
    };
  });

  pairs.sort((a, b) => a.gapMinutes - b.gapMinutes);

  const distribution: HedgeTimingBucket[] = CATEGORY_ORDER.map((cat) => {
    const count = pairs.filter((p) => p.category === cat).length;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      count,
      percentage: pairs.length > 0 ? count / pairs.length : 0,
    };
  });

  const gaps = pairs.map((p) => p.gapMinutes);
  const avgGapMinutes = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

  return {
    pairs,
    distribution,
    avgGapMinutes: round2(avgGapMinutes),
    medianGapMinutes: round2(median(gaps)),
    totalPairsAnalyzed: pairs.length,
  };
}

// ============================================================
// 2. Hedge Efficiency Analysis
// ============================================================

function analyzeHedgeEfficiency(pairCost: PairCostAnalysis): HedgeEfficiencyAnalysis {
  const pairs: HedgeEfficiencyResult[] = pairCost.pairs.map((p) => {
    const capitalInvested = p.hedgedSize * p.pairCost;
    const roi = capitalInvested > 0 ? p.lockedProfit / capitalInvested : 0;
    return {
      conditionId: p.conditionId, title: p.title, slug: p.slug,
      capitalInvested: round2(capitalInvested),
      lockedProfit: p.lockedProfit,
      roi: round4(roi),
      pairCost: p.pairCost,
      hedgedSize: p.hedgedSize,
    };
  });

  const bucketDefs = [
    { range: '< 0.80', min: 0, max: 0.8 },
    { range: '0.80 – 0.85', min: 0.8, max: 0.85 },
    { range: '0.85 – 0.90', min: 0.85, max: 0.9 },
    { range: '0.90 – 0.95', min: 0.9, max: 0.95 },
    { range: '0.95 – 1.00', min: 0.95, max: 1.0 },
    { range: '≥ 1.00', min: 1.0, max: Infinity },
  ];

  const costDistribution: PairCostBucket[] = bucketDefs.map(({ range, min, max }) => {
    const inBucket = pairs.filter((p) =>
      max === Infinity ? p.pairCost >= min : p.pairCost >= min && p.pairCost < max
    );
    const avgRoi = inBucket.length > 0 ? inBucket.reduce((s, p) => s + p.roi, 0) / inBucket.length : 0;
    return { range, min, max, count: inBucket.length, avgRoi: round4(avgRoi) };
  });

  const totalCapitalDeployed = pairs.reduce((s, p) => s + p.capitalInvested, 0);
  const totalLockedProfit = pairs.reduce((s, p) => s + p.lockedProfit, 0);
  const avgPairCost = pairs.length > 0 ? pairs.reduce((s, p) => s + p.pairCost, 0) / pairs.length : 0;
  const avgRoi = pairs.length > 0 ? pairs.reduce((s, p) => s + p.roi, 0) / pairs.length : 0;

  return {
    pairs, costDistribution,
    avgPairCost: round4(avgPairCost),
    avgRoi: round4(avgRoi),
    totalCapitalDeployed: round2(totalCapitalDeployed),
    totalLockedProfit: round2(totalLockedProfit),
    capitalEfficiency: totalCapitalDeployed > 0 ? round4(totalLockedProfit / totalCapitalDeployed) : 0,
  };
}

// ============================================================
// 3. Market Selection Analysis
// ============================================================

function analyzeMarketSelection(
  closedPositions: RawClosedPosition[],
  pairCost: PairCostAnalysis
): MarketSelectionAnalysis {
  const hedgedConditionIds = new Set(pairCost.pairs.map((p) => p.conditionId));

  const pnlByCondition = new Map<string, number>();
  for (const pos of closedPositions) {
    const current = pnlByCondition.get(pos.conditionId) ?? 0;
    pnlByCondition.set(pos.conditionId, current + pos.realizedPnl);
  }

  function buildStats(label: string, conditionIds: string[]): MarketGroupStats {
    const marketCount = conditionIds.length;
    let totalPnl = 0, winCount = 0, lossCount = 0;
    for (const cid of conditionIds) {
      const pnl = pnlByCondition.get(cid) ?? 0;
      totalPnl += pnl;
      if (pnl > 0) winCount++; else lossCount++;
    }
    return {
      label, marketCount,
      totalPnl: round2(totalPnl),
      avgPnlPerMarket: marketCount > 0 ? round2(totalPnl / marketCount) : 0,
      winCount, lossCount,
      winRate: marketCount > 0 ? winCount / marketCount : 0,
    };
  }

  const allConditionIds = Array.from(pnlByCondition.keys());
  return {
    hedged: buildStats('Hedged', allConditionIds.filter((id) => hedgedConditionIds.has(id))),
    singleDirection: buildStats('Single Direction', allConditionIds.filter((id) => !hedgedConditionIds.has(id))),
  };
}

// ============================================================
// 4. Leg Entry Price Analysis (NEW)
// ============================================================

function analyzeLegEntry(hedgePairs: HedgePairData[]): LegEntryAnalysis {
  const pairs: LegEntryPair[] = hedgePairs.map((hp) => {
    const yesVwap = vwap(hp.yesTrades);
    const noVwap = vwap(hp.noTrades);
    const yesSize = hp.yesTrades.reduce((s, t) => s + t.size, 0);
    const noSize = hp.noTrades.reduce((s, t) => s + t.size, 0);

    // Determine first leg by earliest trade
    const firstYes = hp.yesTrades.reduce((e: Trade, t: Trade) => t.timestamp < e.timestamp ? t : e);
    const firstNo = hp.noTrades.reduce((e: Trade, t: Trade) => t.timestamp < e.timestamp ? t : e);
    const firstLeg: 'YES' | 'NO' = firstYes.timestamp <= firstNo.timestamp ? 'YES' : 'NO';

    const firstLegAvgPrice = firstLeg === 'YES' ? yesVwap : noVwap;
    const secondLegAvgPrice = firstLeg === 'YES' ? noVwap : yesVwap;
    const firstLegSize = firstLeg === 'YES' ? yesSize : noSize;
    const secondLegSize = firstLeg === 'YES' ? noSize : yesSize;
    const pairCost = yesVwap + noVwap;

    return {
      conditionId: hp.conditionId,
      title: hp.title,
      slug: hp.slug,
      firstLeg,
      firstLegAvgPrice: round4(firstLegAvgPrice),
      secondLegAvgPrice: round4(secondLegAvgPrice),
      firstLegSize: round2(firstLegSize),
      secondLegSize: round2(secondLegSize),
      pairCost: round4(pairCost),
      spread: round4(Math.abs(firstLegAvgPrice - secondLegAvgPrice)),
    };
  });

  // Price distribution buckets (10c intervals)
  const priceBuckets = [
    { range: '0 – 10c', min: 0, max: 0.1 },
    { range: '10 – 20c', min: 0.1, max: 0.2 },
    { range: '20 – 30c', min: 0.2, max: 0.3 },
    { range: '30 – 40c', min: 0.3, max: 0.4 },
    { range: '40 – 50c', min: 0.4, max: 0.5 },
    { range: '50 – 60c', min: 0.5, max: 0.6 },
    { range: '60 – 70c', min: 0.6, max: 0.7 },
    { range: '70 – 80c', min: 0.7, max: 0.8 },
    { range: '80 – 90c', min: 0.8, max: 0.9 },
    { range: '90 – 100c', min: 0.9, max: 1.01 },
  ];

  const firstLegPriceDist: PriceBucketCount[] = priceBuckets.map(({ range, min, max }) => ({
    range, min, max,
    firstLegCount: pairs.filter((p) => p.firstLegAvgPrice >= min && p.firstLegAvgPrice < max).length,
    secondLegCount: pairs.filter((p) => p.secondLegAvgPrice >= min && p.secondLegAvgPrice < max).length,
  }));

  const avgFirstLegPrice = pairs.length > 0
    ? pairs.reduce((s, p) => s + p.firstLegAvgPrice, 0) / pairs.length : 0;
  const avgSecondLegPrice = pairs.length > 0
    ? pairs.reduce((s, p) => s + p.secondLegAvgPrice, 0) / pairs.length : 0;
  const avgSpread = pairs.length > 0
    ? pairs.reduce((s, p) => s + p.spread, 0) / pairs.length : 0;
  const cheapEntryRate = pairs.length > 0
    ? pairs.filter((p) => p.firstLegAvgPrice < 0.5).length / pairs.length : 0;

  return {
    pairs,
    avgFirstLegPrice: round4(avgFirstLegPrice),
    avgSecondLegPrice: round4(avgSecondLegPrice),
    avgSpread: round4(avgSpread),
    firstLegPriceDist,
    cheapEntryRate: round4(cheapEntryRate),
  };
}

// ============================================================
// 5. Spread Pattern Analysis (NEW)
// ============================================================

function analyzeSpreadPattern(pairCostPairs: PairCostResult[]): SpreadPatternAnalysis {
  const points: SpreadScatterPoint[] = pairCostPairs.map((p) => ({
    conditionId: p.conditionId,
    title: p.title,
    yesPrice: p.avgYesPrice,
    noPrice: p.avgNoPrice,
    pairCost: p.pairCost,
    hedgedSize: p.hedgedSize,
    lockedProfit: p.lockedProfit,
  }));

  const avgYesPrice = points.length > 0
    ? points.reduce((s, p) => s + p.yesPrice, 0) / points.length : 0;
  const avgNoPrice = points.length > 0
    ? points.reduce((s, p) => s + p.noPrice, 0) / points.length : 0;
  const avgPairCost = points.length > 0
    ? points.reduce((s, p) => s + p.pairCost, 0) / points.length : 0;

  const profitablePairs = points.filter((p) => p.pairCost < 1).length;
  const unprofitablePairs = points.filter((p) => p.pairCost >= 1).length;

  return {
    points,
    avgYesPrice: round4(avgYesPrice),
    avgNoPrice: round4(avgNoPrice),
    avgPairCost: round4(avgPairCost),
    profitablePairs,
    unprofitablePairs,
    profitableRate: points.length > 0 ? round4(profitablePairs / points.length) : 0,
  };
}

// ============================================================
// 6. Time-Price Correlation Analysis (NEW)
// ============================================================

function analyzeTimePrice(hedgePairs: HedgePairData[]): TimePriceAnalysis {
  const pairs: TimePricePair[] = hedgePairs.map((hp) => {
    const yesVwap = vwap(hp.yesTrades);
    const noVwap = vwap(hp.noTrades);

    const firstYes = hp.yesTrades.reduce((e: Trade, t: Trade) => t.timestamp < e.timestamp ? t : e);
    const firstNo = hp.noTrades.reduce((e: Trade, t: Trade) => t.timestamp < e.timestamp ? t : e);
    const firstLeg: 'YES' | 'NO' = firstYes.timestamp <= firstNo.timestamp ? 'YES' : 'NO';

    const gapMs = Math.abs(firstYes.timestamp.getTime() - firstNo.timestamp.getTime());
    const gapMinutes = gapMs / (1000 * 60);
    const pairCost = yesVwap + noVwap;

    return {
      conditionId: hp.conditionId,
      title: hp.title,
      slug: hp.slug,
      firstLeg,
      firstLegPrice: round4(firstLeg === 'YES' ? yesVwap : noVwap),
      secondLegPrice: round4(firstLeg === 'YES' ? noVwap : yesVwap),
      gapMinutes: round2(gapMinutes),
      pairCost: round4(pairCost),
      category: categorizeGap(gapMinutes),
    };
  });

  // Buckets by timing category
  const buckets: TimePriceBucket[] = CATEGORY_ORDER.map((cat) => {
    const inCat = pairs.filter((p) => p.category === cat);
    const count = inCat.length;
    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      count,
      avgPairCost: count > 0 ? round4(inCat.reduce((s, p) => s + p.pairCost, 0) / count) : 0,
      avgFirstLegPrice: count > 0 ? round4(inCat.reduce((s, p) => s + p.firstLegPrice, 0) / count) : 0,
      avgSecondLegPrice: count > 0 ? round4(inCat.reduce((s, p) => s + p.secondLegPrice, 0) / count) : 0,
      profitableRate: count > 0 ? round4(inCat.filter((p) => p.pairCost < 1).length / count) : 0,
    };
  });

  // Pearson correlation between gapMinutes and pairCost
  let correlation = 0;
  if (pairs.length > 2) {
    const n = pairs.length;
    const gaps = pairs.map((p) => p.gapMinutes);
    const costs = pairs.map((p) => p.pairCost);
    const meanGap = gaps.reduce((a, b) => a + b, 0) / n;
    const meanCost = costs.reduce((a, b) => a + b, 0) / n;

    let sumNum = 0, sumGap2 = 0, sumCost2 = 0;
    for (let i = 0; i < n; i++) {
      const dg = gaps[i] - meanGap;
      const dc = costs[i] - meanCost;
      sumNum += dg * dc;
      sumGap2 += dg * dg;
      sumCost2 += dc * dc;
    }
    const denom = Math.sqrt(sumGap2 * sumCost2);
    correlation = denom > 0 ? round4(sumNum / denom) : 0;
  }

  return { pairs, buckets, correlation };
}

// ============================================================
// Main Entry Point
// ============================================================

export function analyzeHedging(
  trades: Trade[],
  closedPositions: RawClosedPosition[],
  pairCost: PairCostAnalysis
): HedgeAnalysis {
  const hedgePairs = getHedgePairs(trades);

  const timing = analyzeHedgeTiming(hedgePairs);
  const efficiency = analyzeHedgeEfficiency(pairCost);
  const marketSelection = analyzeMarketSelection(closedPositions, pairCost);
  const legEntry = analyzeLegEntry(hedgePairs);
  const spreadPattern = analyzeSpreadPattern(pairCost.pairs);
  const timePrice = analyzeTimePrice(hedgePairs);

  return { timing, efficiency, marketSelection, legEntry, spreadPattern, timePrice };
}
