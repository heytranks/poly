import type { HedgePair } from '@/lib/utils/hedge-pairs';
import type {
  NewMarketSelectionAnalysis,
  MarketCategory,
  MarketCategoryStats,
  MarketVolumeEntry,
  ConcurrentPositionPoint,
  UpDownCoinStats,
} from '@/lib/types';
import { parseUpDownSlug } from '@/lib/utils/updown-slug';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function classifyMarket(slug: string, title: string): MarketCategory {
  const parsed = parseUpDownSlug(slug);
  if (parsed) return `UpDown ${parsed.timeframe}`;
  const lower = (slug + ' ' + title).toLowerCase();
  if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('btc') ||
      lower.includes('eth') || lower.includes('sol') || lower.includes('token') ||
      lower.includes('coin') || lower.includes('price')) return 'Crypto';
  if (lower.includes('politic') || lower.includes('election') || lower.includes('president') ||
      lower.includes('vote') || lower.includes('trump') || lower.includes('biden') ||
      lower.includes('congress') || lower.includes('senate')) return 'Politics';
  if (lower.includes('sport') || lower.includes('nfl') || lower.includes('nba') ||
      lower.includes('mlb') || lower.includes('soccer') || lower.includes('football') ||
      lower.includes('game') || lower.includes('match') || lower.includes('score')) return 'Sports';
  return 'Other';
}

/** Extract coin and timeframe from UpDown slug, or null */
function parseUpDownInfo(slug: string): { coin: string; timeframe: string } | null {
  const parsed = parseUpDownSlug(slug);
  if (!parsed) return null;
  return { coin: parsed.coin, timeframe: parsed.timeframe };
}

/**
 * Market Selection: "What markets does the bot choose?"
 * Classifies markets by type (with UpDown timeframe breakdown) and analyzes volume distribution.
 */
export function analyzeMarketSelection(
  pairs: HedgePair[]
): NewMarketSelectionAnalysis {
  if (pairs.length === 0) {
    return {
      categoryStats: [],
      updownCoinStats: [],
      topMarkets: [],
      concurrentPositions: [],
      totalMarkets: 0,
    };
  }

  // Classify each pair
  const categorized = pairs.map((p) => ({
    ...p,
    category: classifyMarket(p.slug, p.title),
  }));

  // Collect unique categories dynamically (UpDown timeframes first, then others)
  const uniqueCats = new Set(categorized.map((p) => p.category));
  const updownCats = Array.from(uniqueCats).filter((c) => c.startsWith('UpDown')).sort();
  const otherCats = ['Crypto', 'Politics', 'Sports', 'Other'].filter((c) => uniqueCats.has(c));
  const allCategories = [...updownCats, ...otherCats];

  const categoryStats: MarketCategoryStats[] = allCategories
    .map((cat) => {
      const inCat = categorized.filter((p) => p.category === cat);
      if (inCat.length === 0) return null;
      const totalVolume = round2(inCat.reduce((s, p) => s + p.capitalInvested, 0));
      const avgPairCost = round4(inCat.reduce((s, p) => s + p.pairCost, 0) / inCat.length);
      const profitableRate = round4(inCat.filter((p) => p.isProfitable).length / inCat.length);
      return {
        category: cat,
        marketCount: inCat.length,
        totalVolume,
        avgPairCost,
        profitableRate,
      };
    })
    .filter((s): s is MarketCategoryStats => s !== null);

  // UpDown coin + timeframe breakdown
  const coinKey = (coin: string, tf: string) => `${coin}|${tf}`;
  const coinMap = new Map<string, { coin: string; timeframe: string; pairs: typeof categorized }>();
  for (const p of categorized) {
    const info = parseUpDownInfo(p.slug);
    if (!info) continue;
    const key = coinKey(info.coin, info.timeframe);
    if (!coinMap.has(key)) coinMap.set(key, { coin: info.coin, timeframe: info.timeframe, pairs: [] });
    coinMap.get(key)!.pairs.push(p);
  }

  const updownCoinStats: UpDownCoinStats[] = Array.from(coinMap.values())
    .map(({ coin, timeframe, pairs: coinPairs }) => ({
      coin,
      timeframe,
      marketCount: coinPairs.length,
      totalVolume: round2(coinPairs.reduce((s, p) => s + p.capitalInvested, 0)),
      avgPairCost: round4(coinPairs.reduce((s, p) => s + p.pairCost, 0) / coinPairs.length),
      profitableRate: round4(coinPairs.filter((p) => p.isProfitable).length / coinPairs.length),
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume);

  // Top 20 markets by capital invested
  const topMarkets: MarketVolumeEntry[] = [...pairs]
    .sort((a, b) => b.capitalInvested - a.capitalInvested)
    .slice(0, 20)
    .map((p) => ({
      conditionId: p.conditionId,
      title: p.title,
      capitalInvested: p.capitalInvested,
      pairCost: p.pairCost,
      isProfitable: p.isProfitable,
    }));

  // Concurrent positions over time
  const intervals = pairs.map((p) => ({
    start: Math.min(p.firstYesTimestamp, p.firstNoTimestamp),
    end: p.lastTimestamp,
  }));

  const allTimestamps = intervals.flatMap((i) => [i.start, i.end]);
  const minTs = Math.min(...allTimestamps);
  const maxTs = Math.max(...allTimestamps);
  const hourStep = 3600;

  const concurrentPositions: ConcurrentPositionPoint[] = [];
  for (let ts = minTs; ts <= maxTs; ts += hourStep) {
    const openCount = intervals.filter((i) => ts >= i.start && ts <= i.end).length;
    const d = new Date(ts * 1000);
    const date = d.toISOString().split('T')[0];
    concurrentPositions.push({ timestamp: ts, date, openCount });
  }

  const maxPoints = 500;
  let sampled = concurrentPositions;
  if (concurrentPositions.length > maxPoints) {
    const step = Math.ceil(concurrentPositions.length / maxPoints);
    sampled = concurrentPositions.filter((_, i) => i % step === 0);
  }

  return {
    categoryStats,
    updownCoinStats,
    topMarkets,
    concurrentPositions: sampled,
    totalMarkets: pairs.length,
  };
}
