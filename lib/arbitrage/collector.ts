import { matchMarkets } from './matcher';
import { calculateArbitrage } from './calculator';
import { processAllOpportunities } from './episode-tracker';
import { getAllMatchedMarkets, getRecentEpisodes, getEpisodeStats, getOpenEpisodes } from '@/lib/db/queries';
import { getOrderbook, extractPricesFromOrderbook } from '@/lib/api/predictfun';
import { getClobMarket, parseClobPrices } from '@/lib/api/polymarket-arb';
import { ARB_CONFIG } from '@/lib/constants';
import type { ArbOpportunity, ArbitrageDashboardData, ArbitrageSummary, MarketPrices, MatchedMarket } from '@/lib/types';

// Module-level cache
let cachedOpportunities: ArbOpportunity[] = [];
let lastMatchTime = 0;
let lastCollectTime = 0;
let isCollecting = false;

async function fetchPricesForMarket(market: MatchedMarket): Promise<MarketPrices | null> {
  try {
    const [ob, polyMarket] = await Promise.all([
      getOrderbook(market.predictMarketId),
      getClobMarket(market.polyConditionId),
    ]);

    if (!polyMarket) return null;

    const predictPrices = extractPricesFromOrderbook(ob);
    const polyPrices = parseClobPrices(polyMarket);

    if (predictPrices.yes === 0 && predictPrices.no === 0) return null;
    if (polyPrices.yes === 0 && polyPrices.no === 0) return null;

    return {
      polyYes: polyPrices.yes,
      polyNo: polyPrices.no,
      predictYes: predictPrices.yes,
      predictNo: predictPrices.no,
      updatedAt: Date.now(),
    };
  } catch (err) {
    console.warn(`[collector] Failed to fetch prices for market ${market.id}:`, err);
    return null;
  }
}

export async function collectArbitrage(): Promise<{ matchedCount: number; opportunityCount: number }> {
  if (isCollecting) {
    return {
      matchedCount: cachedOpportunities.length,
      opportunityCount: cachedOpportunities.filter(o => o.bestArbPct > 0).length,
    };
  }

  const now = Date.now();
  if (now - lastCollectTime < ARB_CONFIG.collectCooldownMs) {
    return {
      matchedCount: cachedOpportunities.length,
      opportunityCount: cachedOpportunities.filter(o => o.bestArbPct > 0).length,
    };
  }

  isCollecting = true;
  lastCollectTime = now;

  try {
    // 1. Match markets (with TTL cache)
    let markets: MatchedMarket[];
    if (now - lastMatchTime > ARB_CONFIG.matchCacheTtlMs) {
      console.log('[collector] Refreshing market matches...');
      markets = await matchMarkets();
      lastMatchTime = now;
      console.log(`[collector] Matched ${markets.length} markets`);
    } else {
      markets = getAllMatchedMarkets();
    }

    if (markets.length === 0) {
      cachedOpportunities = [];
      return { matchedCount: 0, opportunityCount: 0 };
    }

    // 2. Fetch prices (batch with concurrency limit)
    const opportunities: ArbOpportunity[] = [];
    const batchSize = 5;

    for (let i = 0; i < markets.length; i += batchSize) {
      const batch = markets.slice(i, i + batchSize);
      const priceResults = await Promise.allSettled(
        batch.map((m) => fetchPricesForMarket(m))
      );

      priceResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          const opp = calculateArbitrage(batch[idx], result.value);
          opportunities.push(opp);
        }
      });
    }

    // 3. Sort by best arb descending
    opportunities.sort((a, b) => b.bestArbPct - a.bestArbPct);

    // 4. Process episodes
    processAllOpportunities(opportunities);

    // 5. Cache
    cachedOpportunities = opportunities;

    console.log(`[collector] ${opportunities.length} opportunities, ${opportunities.filter(o => o.bestArbPct > 0).length} profitable`);

    return {
      matchedCount: markets.length,
      opportunityCount: opportunities.filter(o => o.bestArbPct > 0).length,
    };
  } finally {
    isCollecting = false;
  }
}

export function getCurrentOpportunities(): ArbOpportunity[] {
  return cachedOpportunities;
}

export function getDashboardData(): ArbitrageDashboardData {
  const opportunities = cachedOpportunities;
  const episodes = getRecentEpisodes(100);
  const stats = getEpisodeStats();
  const openEps = getOpenEpisodes();

  const summary: ArbitrageSummary = {
    totalMatched: opportunities.length,
    activeOpportunities: opportunities.filter(o => o.bestArbPct > 0).length,
    bestArbPct: opportunities.length > 0 ? opportunities[0].bestArbPct : 0,
    openEpisodes: openEps.length,
    avgEpisodeDurationMin: Math.round(stats.avgDurationMin * 10) / 10,
    totalEpisodes: stats.total,
    lastCollectedAt: lastCollectTime > 0 ? new Date(lastCollectTime).toISOString() : null,
  };

  return {
    summary,
    opportunities,
    recentEpisodes: episodes,
  };
}
