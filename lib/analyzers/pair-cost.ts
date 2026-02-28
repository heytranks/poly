import type { RawActivity, PairCostResult, PairCostAnalysis } from '@/lib/types';

export function analyzePairCost(activities: RawActivity[]): PairCostAnalysis {
  // Filter to TRADE BUY activities only
  const buyTrades = activities.filter((a) => a.type === 'TRADE' && a.side === 'BUY');

  // Group by conditionId
  const grouped = new Map<string, RawActivity[]>();
  for (const trade of buyTrades) {
    const key = trade.conditionId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(trade);
  }

  const pairs: PairCostResult[] = [];

  for (const [conditionId, condTrades] of Array.from(grouped.entries())) {
    // Split into Yes (outcomeIndex=0) and No (outcomeIndex=1)
    const yesTrades = condTrades.filter((t) => t.outcomeIndex === 0);
    const noTrades = condTrades.filter((t) => t.outcomeIndex === 1);

    // Only pairs where both sides exist
    if (yesTrades.length === 0 || noTrades.length === 0) continue;

    const yesSize = yesTrades.reduce((s, t) => s + t.size, 0);
    const noSize = noTrades.reduce((s, t) => s + t.size, 0);

    // Volume-weighted average prices
    const avgYesPrice = yesTrades.reduce((s, t) => s + t.price * t.size, 0) / yesSize;
    const avgNoPrice = noTrades.reduce((s, t) => s + t.price * t.size, 0) / noSize;

    const pairCost = avgYesPrice + avgNoPrice;
    const hedgedSize = Math.min(yesSize, noSize);
    const lockedProfit = pairCost < 1 ? hedgedSize * (1 - pairCost) : 0;

    const firstTrade = condTrades[0];
    pairs.push({
      conditionId,
      title: firstTrade.title,
      slug: firstTrade.slug,
      avgYesPrice: Math.round(avgYesPrice * 10000) / 10000,
      avgNoPrice: Math.round(avgNoPrice * 10000) / 10000,
      pairCost: Math.round(pairCost * 10000) / 10000,
      yesSize: Math.round(yesSize * 100) / 100,
      noSize: Math.round(noSize * 100) / 100,
      hedgedSize: Math.round(hedgedSize * 100) / 100,
      lockedProfit: Math.round(lockedProfit * 100) / 100,
      isLocked: pairCost < 1,
    });
  }

  // Sort by locked profit descending
  pairs.sort((a, b) => b.lockedProfit - a.lockedProfit);

  const lockedPairs = pairs.filter((p) => p.isLocked);
  const totalLockedProfit = lockedPairs.reduce((s, p) => s + p.lockedProfit, 0);
  const totalConditions = new Set(buyTrades.map((t) => t.conditionId)).size;
  const usageRate = totalConditions > 0 ? pairs.length / totalConditions : 0;

  return {
    pairs,
    totalPairs: pairs.length,
    lockedPairs: lockedPairs.length,
    totalLockedProfit: Math.round(totalLockedProfit * 100) / 100,
    usageRate,
  };
}
