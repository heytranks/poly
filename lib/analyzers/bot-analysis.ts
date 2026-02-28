import type {
  RawActivity,
  BotAnalysis,
  BotOverview,
  EntryOddsBucket,
  CoinBreakdown,
  UpDownMarketMeta,
} from '@/lib/types';
import { parseUpDownSlug } from '@/lib/utils/updown-slug';

/**
 * Analyze bot betting patterns for UpDown 5m markets.
 * Activity-only: shows trading patterns without PnL/win rate.
 * Returns undefined if no UpDown markets found.
 */
export function analyzeBotStrategy(activities: RawActivity[]): BotAnalysis | undefined {
  const markets = buildMarketMetas(activities);
  if (markets.length === 0) return undefined;

  const overview = buildOverview(markets);
  const entryOdds = buildEntryOddsBuckets(markets);
  const coinBreakdown = buildCoinBreakdown(markets);

  return { overview, entryOdds, coinBreakdown, markets };
}

function buildMarketMetas(activities: RawActivity[]): UpDownMarketMeta[] {
  const slugMap = new Map<string, RawActivity>();
  for (const a of activities) {
    if (a.type !== 'TRADE' || a.side !== 'BUY') continue;
    const parsed = parseUpDownSlug(a.slug);
    if (!parsed) continue;
    if (!slugMap.has(a.slug)) {
      slugMap.set(a.slug, a);
    }
  }

  const results: UpDownMarketMeta[] = [];
  for (const [slug, activity] of Array.from(slugMap.entries())) {
    const parsed = parseUpDownSlug(slug)!;
    results.push({
      slug,
      coin: parsed.coin,
      windowStartSec: parsed.windowStartSec,
      outcomeIndex: activity.outcomeIndex,
      entryPrice: activity.price,
      usdcSize: activity.usdcSize,
      conditionId: activity.conditionId,
    });
  }

  return results;
}

function buildOverview(markets: UpDownMarketMeta[]): BotOverview {
  if (markets.length === 0) {
    return { totalMarkets: 0, upBets: 0, downBets: 0, avgEntryOdds: 0, totalVolume: 0 };
  }

  const ups = markets.filter((m) => m.outcomeIndex === 0);
  const downs = markets.filter((m) => m.outcomeIndex === 1);
  const avgEntry = markets.reduce((s, m) => s + m.entryPrice, 0) / markets.length;
  const totalVolume = markets.reduce((s, m) => s + m.usdcSize, 0);

  return {
    totalMarkets: markets.length,
    upBets: ups.length,
    downBets: downs.length,
    avgEntryOdds: avgEntry,
    totalVolume: Math.round(totalVolume * 100) / 100,
  };
}

function buildEntryOddsBuckets(markets: UpDownMarketMeta[]): EntryOddsBucket[] {
  const buckets: EntryOddsBucket[] = [
    { range: '0-20c', min: 0, max: 0.2, count: 0, totalVolume: 0 },
    { range: '20-40c', min: 0.2, max: 0.4, count: 0, totalVolume: 0 },
    { range: '40-60c', min: 0.4, max: 0.6, count: 0, totalVolume: 0 },
    { range: '60-80c', min: 0.6, max: 0.8, count: 0, totalVolume: 0 },
    { range: '80-100c', min: 0.8, max: 1.0, count: 0, totalVolume: 0 },
  ];

  for (const m of markets) {
    const idx = m.entryPrice >= 1.0 ? 4 : Math.min(Math.floor(m.entryPrice / 0.2), 4);
    buckets[idx].count++;
    buckets[idx].totalVolume += m.usdcSize;
  }

  for (const b of buckets) {
    b.totalVolume = Math.round(b.totalVolume * 100) / 100;
  }

  return buckets;
}

function buildCoinBreakdown(markets: UpDownMarketMeta[]): CoinBreakdown[] {
  const map = new Map<string, { count: number; totalVolume: number }>();

  for (const m of markets) {
    const entry = map.get(m.coin) ?? { count: 0, totalVolume: 0 };
    entry.count++;
    entry.totalVolume += m.usdcSize;
    map.set(m.coin, entry);
  }

  return Array.from(map.entries())
    .map(([coin, d]) => ({
      coin,
      count: d.count,
      totalVolume: Math.round(d.totalVolume * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);
}
