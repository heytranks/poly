'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradesTable } from '@/components/trades/trades-table';
import { PnlChart } from '@/components/charts/pnl-chart';
import { PairCostCard } from '@/components/strategy/pair-cost-card';
import { HedgeTimingCard } from '@/components/strategy/hedge-timing-card';
import { HedgeEfficiencyCard } from '@/components/strategy/hedge-efficiency-card';
import { MarketSelectionCard } from '@/components/strategy/market-selection-card';
import { LegEntryCard } from '@/components/strategy/leg-entry-card';
import { SpreadPatternCard } from '@/components/strategy/spread-pattern-card';
import { TimePriceCard } from '@/components/strategy/time-price-card';
import { TimingHeatmap } from '@/components/charts/timing-heatmap';
import { CategoryChart } from '@/components/charts/category-chart';
import { DirectionChart } from '@/components/charts/direction-chart';
import { EntryPriceChart } from '@/components/charts/entry-price-chart';
import type { AnalysisSummary, Trade } from '@/lib/types';

interface DashboardTabsProps {
  analysis: AnalysisSummary;
  trades: Trade[];
}

export function DashboardTabs({ analysis, trades }: DashboardTabsProps) {
  return (
    <Tabs defaultValue="trades" className="w-full">
      <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="trades">Trades</TabsTrigger>
        <TabsTrigger value="pnl">PnL Chart</TabsTrigger>
        <TabsTrigger value="strategy">Strategy</TabsTrigger>
        <TabsTrigger value="categories">Markets</TabsTrigger>
        <TabsTrigger value="timing">Timing</TabsTrigger>
        <TabsTrigger value="direction">Direction</TabsTrigger>
        <TabsTrigger value="entry">Entry Price</TabsTrigger>
      </TabsList>

      <TabsContent value="trades" className="mt-4">
        <TradesTable trades={trades} />
      </TabsContent>

      <TabsContent value="pnl" className="mt-4">
        <PnlChart data={analysis.pnl.cumulativePnlSeries} />
      </TabsContent>

      <TabsContent value="strategy" className="mt-4">
        <div className="space-y-4">
          <PairCostCard analysis={analysis.pairCost} />
          {analysis.hedgeAnalysis && (
            <>
              <LegEntryCard data={analysis.hedgeAnalysis.legEntry} />
              <SpreadPatternCard data={analysis.hedgeAnalysis.spreadPattern} />
              <TimePriceCard data={analysis.hedgeAnalysis.timePrice} />
              <HedgeTimingCard data={analysis.hedgeAnalysis.timing} />
              <HedgeEfficiencyCard data={analysis.hedgeAnalysis.efficiency} />
              <MarketSelectionCard data={analysis.hedgeAnalysis.marketSelection} />
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="categories" className="mt-4">
        {analysis.categories ? (
          <CategoryChart data={analysis.categories} />
        ) : (
          <p className="text-muted-foreground text-center py-8">No category data available</p>
        )}
      </TabsContent>

      <TabsContent value="timing" className="mt-4">
        {analysis.timing ? (
          <TimingHeatmap data={analysis.timing} />
        ) : (
          <p className="text-muted-foreground text-center py-8">No timing data available</p>
        )}
      </TabsContent>

      <TabsContent value="direction" className="mt-4">
        {analysis.direction ? (
          <DirectionChart data={analysis.direction} />
        ) : (
          <p className="text-muted-foreground text-center py-8">No direction data available</p>
        )}
      </TabsContent>

      <TabsContent value="entry" className="mt-4">
        {analysis.entryPrice ? (
          <EntryPriceChart data={analysis.entryPrice} />
        ) : (
          <p className="text-muted-foreground text-center py-8">No entry price data available</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
