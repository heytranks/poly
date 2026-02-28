'use client';

import {
  PieChart,
  Pie,
  Cell,
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
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { CategoryBreakdown } from '@/lib/types';

const PIE_COLORS = ['#7c3aed', '#a78bfa', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#ec4899', '#06b6d4'];

interface CategoryChartProps {
  data: CategoryBreakdown[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          카테고리 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  // Top 8 categories for pie chart
  const topCategories = data.slice(0, 8);
  const pieData = topCategories.map((c) => ({
    name: c.category.length > 30 ? c.category.slice(0, 30) + '...' : c.category,
    value: c.tradeCount,
  }));

  // Top 10 for volume bar chart
  const barData = data.slice(0, 10).map((c) => ({
    name: c.category.length > 20 ? c.category.slice(0, 20) + '...' : c.category,
    volume: c.dollarVolume,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Trade Distribution Pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">마켓별 거래 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label={({ name, percent }: any) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                labelLine={false}
                fontSize={11}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                {...TOOLTIP_STYLE}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Volume Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">마켓별 거래액</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => formatCurrency(v)}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                stroke="hsl(220 10% 40%)"
                fontSize={10}
                tick={{ fill: 'hsl(220 10% 55%)' }}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number | undefined) => [formatCurrency(value ?? 0), '거래액']}
              />
              <Bar dataKey="volume" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Market Stats Table */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">마켓별 거래 상세</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-4">마켓</th>
                  <th className="text-right py-2 px-2">거래 수</th>
                  <th className="text-right py-2 px-2">거래액</th>
                  <th className="text-right py-2 px-2">쉐어</th>
                  <th className="text-right py-2 px-2">비중</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 15).map((cat) => (
                  <tr key={cat.category} className="border-b border-border/50">
                    <td className="py-2 pr-4 truncate max-w-[250px]">{cat.category}</td>
                    <td className="text-right py-2 px-2">{cat.tradeCount}</td>
                    <td className="text-right py-2 px-2">{formatCurrency(cat.dollarVolume)}</td>
                    <td className="text-right py-2 px-2">{cat.sharesVolume.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">{formatPercent(cat.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
