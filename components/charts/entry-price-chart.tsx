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
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { EntryPriceBucket } from '@/lib/types';

interface EntryPriceChartProps {
  data: EntryPriceBucket[];
}

export function EntryPriceChart({ data }: EntryPriceChartProps) {
  const filteredData = data.filter((d) => d.count > 0);

  if (filteredData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No entry price data available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Avg PnL by entry price */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Avg PnL by Entry Price</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="range"
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Avg PnL']}
              />
              <Bar dataKey="avgPnl" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.avgPnl >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Win rate by entry price + trade count scatter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Win Rate & Volume by Entry Price</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="min"
                name="Entry Price"
                type="number"
                domain={[0, 1]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}c`}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <YAxis
                dataKey="winRate"
                name="Win Rate"
                type="number"
                domain={[0, 1]}
                tickFormatter={(v) => formatPercent(v)}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <ZAxis dataKey="count" range={[40, 400]} name="Trades" />
              <Tooltip
                {...TOOLTIP_STYLE}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => {
                  if (name === 'Win Rate') return [formatPercent(value ?? 0), name];
                  if (name === 'Entry Price') return [`${((value ?? 0) * 100).toFixed(0)}c`, name];
                  return [value, name];
                }}
              />
              <Scatter
                data={filteredData}
                fill="#7c3aed"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
