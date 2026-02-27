'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { HedgeEfficiencyAnalysis } from '@/lib/types';

interface HedgeEfficiencyCardProps {
  data: HedgeEfficiencyAnalysis;
}

export function HedgeEfficiencyCard({ data }: HedgeEfficiencyCardProps) {
  if (data.pairs.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No hedge efficiency data available
        </CardContent>
      </Card>
    );
  }

  const sortedByRoi = [...data.pairs].sort((a, b) => b.roi - a.roi);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Hedge Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Capital Deployed</p>
              <p className="text-xl font-bold">{formatCurrency(data.totalCapitalDeployed)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Locked Profit</p>
              <p className="text-xl font-bold text-green-500">{formatCurrency(data.totalLockedProfit)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Pair Cost</p>
              <p className="text-xl font-bold">{data.avgPairCost.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Capital Efficiency</p>
              <p className="text-xl font-bold">{formatPercent(data.capitalEfficiency)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histogram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pair Cost Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.costDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis dataKey="range" stroke="hsl(220 10% 40%)" fontSize={11} />
              <YAxis stroke="hsl(220 10% 40%)" fontSize={11} allowDecimals={false} />
              <Tooltip
                {...TOOLTIP_STYLE}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [value ?? 0, 'Pairs']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.costDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.min < 1 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top ROI list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 10 by ROI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedByRoi.slice(0, 10).map((pair, idx) => (
            <div key={pair.conditionId}>
              {idx > 0 && <Separator className="mb-3" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pair.title}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>Cost: {pair.pairCost.toFixed(4)}</span>
                    <span>Capital: {formatCurrency(pair.capitalInvested)}</span>
                    <span>Profit: {formatCurrency(pair.lockedProfit)}</span>
                  </div>
                </div>
                <Badge className={pair.roi > 0
                  ? 'bg-green-500/20 text-green-500 border-green-500/30'
                  : 'bg-muted text-muted-foreground'
                }>
                  {formatPercent(pair.roi)} ROI
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
