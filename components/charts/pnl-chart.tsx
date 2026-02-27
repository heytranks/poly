'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { COLORS, TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { PnlDataPoint } from '@/lib/types';

type Granularity = 'daily' | 'weekly';
type Period = '7d' | '30d' | '90d' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7D',
  '30d': '30D',
  '90d': '90D',
  all: 'All',
};

interface PnlChartProps {
  data: PnlDataPoint[];
}

export function PnlChart({ data }: PnlChartProps) {
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [period, setPeriod] = useState<Period>('all');

  const filteredData = useMemo(() => {
    if (period === 'all') return data;

    const now = new Date();
    const daysMap: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90, all: 0 };
    const cutoff = new Date(now.getTime() - daysMap[period] * 86400000);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return data.filter((d) => d.date >= cutoffStr);
  }, [data, period]);

  const chartData = useMemo(() => {
    if (granularity === 'daily') return filteredData;

    // Weekly: group by ISO week
    const weekMap = new Map<string, { date: string; cumulativePnl: number; tradePnl: number }>();
    for (const point of filteredData) {
      const d = new Date(point.date);
      // Get Monday of the week
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setUTCDate(diff);
      const weekKey = monday.toISOString().split('T')[0];

      const existing = weekMap.get(weekKey);
      if (!existing) {
        weekMap.set(weekKey, { date: weekKey, cumulativePnl: point.cumulativePnl, tradePnl: point.tradePnl });
      } else {
        // Keep the last cumulative value, sum tradePnl
        existing.cumulativePnl = point.cumulativePnl;
        existing.tradePnl += point.tradePnl;
      }
    }

    return Array.from(weekMap.values());
  }, [filteredData, granularity]);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px] text-muted-foreground">
          No PnL data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Cumulative PnL</CardTitle>
          <div className="flex gap-1">
            {/* Period buttons */}
            <div className="flex gap-1 mr-2">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setPeriod(p)}
                >
                  {PERIOD_LABELS[p]}
                </Button>
              ))}
            </div>
            {/* Granularity toggle */}
            <div className="flex gap-1 border-l border-border pl-2">
              <Button
                variant={granularity === 'daily' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setGranularity('daily')}
              >
                Daily
              </Button>
              <Button
                variant={granularity === 'weekly' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setGranularity('weekly')}
              >
                Weekly
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.4} />
                <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => {
                const d = new Date(v);
                if (granularity === 'weekly') {
                  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
                }
                return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
              }}
              stroke="hsl(220 10% 40%)"
              fontSize={11}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(v) => formatCurrency(v)}
              stroke="hsl(220 10% 40%)"
              fontSize={11}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(label) => {
                const d = new Date(label);
                return d.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                });
              }}
              formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Cumulative PnL']}
            />
            <Area
              type="monotone"
              dataKey="cumulativePnl"
              stroke={COLORS.accent}
              fill="url(#pnlGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {chartData.length} data points ({granularity})
        </p>
      </CardContent>
    </Card>
  );
}
