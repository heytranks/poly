'use client';

import { useArbitrageData } from '@/hooks/use-arbitrage-data';
import { ArbSummaryCards } from './arb-summary-cards';
import { ArbOpportunitiesTable } from './arb-opportunities-table';
import { ArbEpisodesTable } from './arb-episodes-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function ArbitrageDashboard() {
  const { data, loading, error, collecting, refresh } = useArbitrageData();

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg text-red-400 mb-4">Failed to load arbitrage data</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={refresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Arbitrage Monitor</h1>
          <p className="text-sm text-muted-foreground">
            PredictFun × Polymarket cross-market spread tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data.summary.lastCollectedAt && (
            <span className="text-xs text-muted-foreground">
              Updated {formatRelative(data.summary.lastCollectedAt)}
            </span>
          )}
          <Button onClick={refresh} variant="outline" size="sm" disabled={collecting}>
            {collecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <ArbSummaryCards summary={data.summary} />

      <Tabs defaultValue="opportunities">
        <TabsList>
          <TabsTrigger value="opportunities">
            Opportunities ({data.opportunities.length})
          </TabsTrigger>
          <TabsTrigger value="episodes">
            Episodes ({data.recentEpisodes.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="opportunities" className="mt-4">
          <ArbOpportunitiesTable opportunities={data.opportunities} />
        </TabsContent>
        <TabsContent value="episodes" className="mt-4">
          <ArbEpisodesTable episodes={data.recentEpisodes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
