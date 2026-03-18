import { ARB_CONFIG } from '@/lib/constants';
import {
  getOpenEpisodeForMarket,
  openEpisode,
  updateEpisodePeak,
  closeEpisode,
} from '@/lib/db/queries';
import type { ArbOpportunity } from '@/lib/types';

export function processOpportunity(opp: ArbOpportunity): void {
  const existing = getOpenEpisodeForMarket(opp.matchedMarketId);
  const threshold = ARB_CONFIG.episodeThresholdPct;

  if (opp.bestArbPct >= threshold) {
    if (!existing) {
      // New episode
      openEpisode({
        matchedMarketId: opp.matchedMarketId,
        title: opp.title,
        strategy: opp.bestStrategy === 'NONE' ? 'A' : opp.bestStrategy,
        thresholdPct: threshold,
        arbPct: opp.bestArbPct,
      });
    } else if (opp.bestArbPct > existing.peakArbPct) {
      // Update peak
      updateEpisodePeak(existing.id, opp.bestArbPct);
    }
  } else {
    if (existing) {
      // Gap closed — end episode
      closeEpisode(existing.id);
    }
  }
}

export function processAllOpportunities(opps: ArbOpportunity[]): {
  opened: number;
  closed: number;
  updated: number;
} {
  let opened = 0;
  let closed = 0;
  let updated = 0;

  const processedMarketIds = new Set<number>();

  for (const opp of opps) {
    processedMarketIds.add(opp.matchedMarketId);
    const existing = getOpenEpisodeForMarket(opp.matchedMarketId);
    const threshold = ARB_CONFIG.episodeThresholdPct;

    if (opp.bestArbPct >= threshold) {
      if (!existing) {
        openEpisode({
          matchedMarketId: opp.matchedMarketId,
          title: opp.title,
          strategy: opp.bestStrategy === 'NONE' ? 'A' : opp.bestStrategy,
          thresholdPct: threshold,
          arbPct: opp.bestArbPct,
        });
        opened++;
      } else if (opp.bestArbPct > existing.peakArbPct) {
        updateEpisodePeak(existing.id, opp.bestArbPct);
        updated++;
      }
    } else {
      if (existing) {
        closeEpisode(existing.id);
        closed++;
      }
    }
  }

  return { opened, closed, updated };
}
