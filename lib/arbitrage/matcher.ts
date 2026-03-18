import { getOpenMarketsWithPolyIds } from '@/lib/api/predictfun';
import { getClobMarket } from '@/lib/api/polymarket-arb';
import { upsertMatchedMarket, getAllMatchedMarkets } from '@/lib/db/queries';
import type { MatchedMarket } from '@/lib/types';

export async function matchMarkets(): Promise<MatchedMarket[]> {
  const predictMarkets = await getOpenMarketsWithPolyIds();

  const batchSize = 5;
  for (let i = 0; i < predictMarkets.length; i += batchSize) {
    const batch = predictMarkets.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (pm) => {
        const polyConditionId = pm.polymarketConditionIds[0];
        if (!polyConditionId) return;

        const polyMarket = await getClobMarket(polyConditionId);
        if (!polyMarket || !polyMarket.active || polyMarket.closed) return;

        upsertMatchedMarket({
          predictMarketId: pm.id,
          predictTitle: pm.title,
          polyConditionId,
          polySlug: polyMarket.market_slug || '',
          polyQuestion: polyMarket.question || '',
          category: pm.categorySlug || '',
          predictFeeBps: pm.feeRateBps || 200,
        });
      })
    );

    results.forEach((r, idx) => {
      if (r.status === 'rejected') {
        console.warn(`[matcher] Failed to match market ${batch[idx]?.id}:`, r.reason);
      }
    });
  }

  return getAllMatchedMarkets();
}
