'use client';

import { StatCard } from '@/components/shared/stat-card';
import type { ArbitrageSummary } from '@/lib/types';

interface ArbSummaryCardsProps {
  summary: ArbitrageSummary;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ArbSummaryCards({ summary }: ArbSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        label="Matched Markets"
        value={String(summary.totalMatched)}
      />
      <StatCard
        label="Opportunities"
        value={String(summary.activeOpportunities)}
        trend={summary.activeOpportunities > 0 ? 'up' : 'neutral'}
      />
      <StatCard
        label="Best Arb"
        value={`${summary.bestArbPct.toFixed(2)}%`}
        trend={summary.bestArbPct > 0 ? 'up' : 'neutral'}
      />
      <StatCard
        label="Open Episodes"
        value={String(summary.openEpisodes)}
        trend={summary.openEpisodes > 0 ? 'up' : 'neutral'}
      />
      <StatCard
        label="Avg Duration"
        value={formatDuration(summary.avgEpisodeDurationMin)}
      />
      <StatCard
        label="Total Episodes"
        value={String(summary.totalEpisodes)}
      />
    </div>
  );
}
