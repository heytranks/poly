'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { PairCostAnalysis } from '@/lib/types';

interface PairCostCardProps {
  analysis: PairCostAnalysis;
}

export function PairCostCard({ analysis }: PairCostCardProps) {
  if (analysis.totalPairs === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No pair trading detected. This user doesn&apos;t appear to trade both sides of markets.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Pair Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pairs</p>
              <p className="text-xl font-bold">{analysis.totalPairs}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Locked Pairs</p>
              <p className="text-xl font-bold text-green-500">{analysis.lockedPairs}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Locked Profit</p>
              <p className="text-xl font-bold text-green-500">{formatCurrency(analysis.totalLockedProfit)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usage Rate</p>
              <p className="text-xl font-bold">{formatPercent(analysis.usageRate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top pairs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Pair Trades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.pairs.slice(0, 10).map((pair, idx) => (
            <div key={pair.conditionId}>
              {idx > 0 && <Separator className="mb-3" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{pair.title}</p>
                    {pair.isLocked && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30 shrink-0">
                        Locked Profit
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>
                      YES: {pair.avgYesPrice.toFixed(2)} ({pair.yesSize.toFixed(0)} shares)
                    </span>
                    <span>
                      NO: {pair.avgNoPrice.toFixed(2)} ({pair.noSize.toFixed(0)} shares)
                    </span>
                    <span>Hedged: {pair.hedgedSize.toFixed(0)} shares</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono">
                    Cost: <span className={pair.pairCost < 1 ? 'text-green-500' : 'text-red-500'}>
                      {pair.pairCost.toFixed(4)}
                    </span>
                  </p>
                  {pair.isLocked && (
                    <p className="text-xs text-green-500">
                      +{formatCurrency(pair.lockedProfit)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
