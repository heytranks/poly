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
import { TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { DirectionAnalysis } from '@/lib/types';

interface DirectionChartProps {
  data: DirectionAnalysis;
}

export function DirectionChart({ data }: DirectionChartProps) {
  const total = data.yesCount + data.noCount;
  if (total === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No direction data available
        </CardContent>
      </Card>
    );
  }

  const barData = [
    { name: 'YES', count: data.yesCount, pnl: data.yesPnl, winRate: data.yesWinRate },
    { name: 'NO', count: data.noCount, pnl: data.noPnl, winRate: data.noWinRate },
  ];

  const biasColor =
    data.bias === 'YES' ? 'bg-green-500/20 text-green-500' :
    data.bias === 'NO' ? 'bg-red-500/20 text-red-500' :
    'bg-muted text-muted-foreground';

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Direction Bias</CardTitle>
            <Badge className={biasColor}>{data.bias} Bias</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* YES side */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-semibold text-green-500">YES</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trades</span>
                  <span>{data.yesCount} ({formatPercent(total > 0 ? data.yesCount / total : 0)})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PnL</span>
                  <span className={data.yesPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(data.yesPnl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span>{formatPercent(data.yesWinRate)}</span>
                </div>
              </div>
              {/* Visual bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (data.yesCount / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* NO side */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="font-semibold text-red-500">NO</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trades</span>
                  <span>{data.noCount} ({formatPercent(total > 0 ? data.noCount / total : 0)})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PnL</span>
                  <span className={data.noPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(data.noPnl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span>{formatPercent(data.noWinRate)}</span>
                </div>
              </div>
              {/* Visual bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${total > 0 ? (data.noCount / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PnL comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">PnL by Direction</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis dataKey="name" stroke="hsl(220 10% 40%)" fontSize={12} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="hsl(220 10% 40%)" fontSize={11} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'PnL']}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.name === 'YES' ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
