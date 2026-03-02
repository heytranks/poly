'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { TradesTable } from '@/components/trades/trades-table';
import { StrategyPanel } from '@/components/bot-analysis/strategy-panel';
import { MarketPanel } from '@/components/bot-analysis/market-panel';
import { SizingProfitPanel } from '@/components/bot-analysis/sizing-profit-panel';
import { PriceContextPanel } from '@/components/bot-analysis/price-context-panel';
import { BotLogicSection } from '@/components/bot-analysis/bot-logic-section';
import type { AnalysisSummary, Trade } from '@/lib/types';
import type { HedgePair } from '@/lib/utils/hedge-pairs';

interface DashboardTabsProps {
  analysis: AnalysisSummary;
  trades: Trade[];
  hedgePairs?: HedgePair[];
}

export function DashboardTabs({ analysis, trades, hedgePairs }: DashboardTabsProps) {
  const [tradesOpen, setTradesOpen] = useState(false);

  const defaultTab = analysis.priceContext ? 'price-context' : 'strategy';

  return (
    <div className="space-y-4">
      {/* Trades toggle */}
      <Card>
        <button
          onClick={() => setTradesOpen(!tradesOpen)}
          className="flex items-center justify-between w-full text-left px-6 py-3"
        >
          <span className="text-lg font-semibold">거래 내역</span>
          <span className="text-sm text-muted-foreground">
            {trades.length}건 {tradesOpen ? '▲' : '▼'}
          </span>
        </button>
        {tradesOpen && (
          <CardContent className="pt-0">
            <TradesTable trades={trades} hedgePairs={hedgePairs} />
          </CardContent>
        )}
      </Card>

      {/* Analysis tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
          {analysis.priceContext && (
            <TabsTrigger value="price-context">거래 타이밍</TabsTrigger>
          )}
          {analysis.priceContext && (
            <TabsTrigger value="bot-logic">봇 로직</TabsTrigger>
          )}
          {analysis.strategyProfitability && analysis.execution && (
            <TabsTrigger value="strategy">헷지 분석</TabsTrigger>
          )}
          {analysis.marketSelection && (
            <TabsTrigger value="market">마켓 분포</TabsTrigger>
          )}
          {analysis.positionSizing && analysis.profitStructure && (
            <TabsTrigger value="sizing-profit">투입 & 수익</TabsTrigger>
          )}
        </TabsList>

        {analysis.priceContext && (
          <TabsContent value="price-context" className="mt-4">
            <PriceContextPanel data={analysis.priceContext} />
          </TabsContent>
        )}

        {analysis.priceContext && (
          <TabsContent value="bot-logic" className="mt-4">
            <BotLogicSection markets={analysis.priceContext.markets} />
          </TabsContent>
        )}

        {analysis.strategyProfitability && analysis.execution && hedgePairs && (
          <TabsContent value="strategy" className="mt-4">
            <StrategyPanel
              profitability={analysis.strategyProfitability}
              execution={analysis.execution}
              hedgePairs={hedgePairs}
            />
          </TabsContent>
        )}

        {analysis.marketSelection && (
          <TabsContent value="market" className="mt-4">
            <MarketPanel data={analysis.marketSelection} />
          </TabsContent>
        )}

        {analysis.positionSizing && analysis.profitStructure && (
          <TabsContent value="sizing-profit" className="mt-4">
            <SizingProfitPanel sizing={analysis.positionSizing} profit={analysis.profitStructure} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
