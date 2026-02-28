'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
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
          진입가 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Trade count by entry price */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">진입가별 거래 수</CardTitle>
          <p className="text-xs text-muted-foreground">BUY 거래의 매수가 분포</p>
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
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number | undefined) => [value ?? 0, '거래 수']}
              />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Volume by entry price */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">진입가별 거래액</CardTitle>
          <p className="text-xs text-muted-foreground">가격대별 투입 USDC</p>
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
                formatter={(value: number | undefined) => [formatCurrency(value ?? 0), '거래액']}
              />
              <Bar dataKey="totalVolume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
