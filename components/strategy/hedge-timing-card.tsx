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
import type { HedgeTimingAnalysis, HedgeTimingCategory } from '@/lib/types';

interface HedgeTimingCardProps {
  data: HedgeTimingAnalysis;
}

const CATEGORY_COLORS: Record<HedgeTimingCategory, string> = {
  simultaneous: '#22c55e',
  quick: '#a855f7',
  gradual: '#eab308',
  delayed: '#ef4444',
};

const CATEGORY_BADGE_STYLES: Record<HedgeTimingCategory, string> = {
  simultaneous: 'bg-green-500/20 text-green-500 border-green-500/30',
  quick: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  gradual: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  delayed: 'bg-red-500/20 text-red-500 border-red-500/30',
};

function formatGap(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

export function HedgeTimingCard({ data }: HedgeTimingCardProps) {
  if (data.totalPairsAnalyzed === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No hedge timing data available
        </CardContent>
      </Card>
    );
  }

  const topCategory = [...data.distribution].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Hedge Timing Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pairs</p>
              <p className="text-xl font-bold">{data.totalPairsAnalyzed}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Gap</p>
              <p className="text-xl font-bold">{formatGap(data.avgGapMinutes)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Median Gap</p>
              <p className="text-xl font-bold">{formatGap(data.medianGapMinutes)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Most Common</p>
              <Badge className={CATEGORY_BADGE_STYLES[topCategory.category]}>
                {topCategory.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Timing Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis dataKey="label" stroke="hsl(220 10% 40%)" fontSize={11} />
              <YAxis stroke="hsl(220 10% 40%)" fontSize={11} allowDecimals={false} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number | undefined) => [value ?? 0, 'Pairs']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.distribution.map((entry, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[entry.category]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top pairs table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top 10 Hedge Pairs by Timing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.pairs.slice(0, 10).map((pair, idx) => (
            <div key={pair.conditionId}>
              {idx > 0 && <Separator className="mb-3" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pair.title}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>First Leg: {pair.firstLeg}</span>
                    <span>Gap: {formatGap(pair.gapMinutes)}</span>
                  </div>
                </div>
                <Badge className={CATEGORY_BADGE_STYLES[pair.category]}>
                  {pair.category}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
