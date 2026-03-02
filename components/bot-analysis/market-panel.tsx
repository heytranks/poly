'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { COLORS, TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { NewMarketSelectionAnalysis } from '@/lib/types';

interface MarketPanelProps {
  data: NewMarketSelectionAnalysis;
}

const PIE_COLORS = ['#7c3aed', '#22c55e', '#3b82f6', '#f59e0b', '#94a3b8'];

export function MarketPanel({ data }: MarketPanelProps) {
  if (data.totalMarkets === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          마켓 선택 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  const pieData = data.categoryStats.map((s) => ({
    name: s.category,
    value: s.marketCount,
  }));

  return (
    <div className="space-y-4">
      {/* Category distribution + Stats table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">마켓 유형 분포</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            헷지 페어를 slug/title 패턴으로 분류. UpDown 타임프레임별, Crypto, Politics, Sports, Other.
          </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">유형별 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2">유형</th>
                    <th className="text-right py-2">마켓 수</th>
                    <th className="text-right py-2">거래량</th>
                    <th className="text-right py-2">평균 Cost</th>
                    <th className="text-right py-2">수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryStats.map((s) => (
                    <tr key={s.category} className="border-b border-border/50">
                      <td className="py-2 font-medium">{s.category}</td>
                      <td className="text-right py-2">{s.marketCount}</td>
                      <td className="text-right py-2">{formatCurrency(s.totalVolume)}</td>
                      <td className="text-right py-2">{s.avgPairCost.toFixed(4)}</td>
                      <td className={`text-right py-2 ${s.profitableRate > 0.5 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPercent(s.profitableRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* UpDown Coin × Timeframe breakdown */}
      {data.updownCoinStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">UpDown 코인별 거래량</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                코인별 USDC 투입금 비중.
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.updownCoinStats.map((s) => ({
                      name: `${s.coin} ${s.timeframe}`,
                      value: s.totalVolume,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {data.updownCoinStats.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(value: number | undefined) => [formatCurrency(value ?? 0), '투입금']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">UpDown 코인별 통계</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                코인 × 타임프레임별 거래량, 평균 Cost, 수익률.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2">코인</th>
                    <th className="text-left py-2">TF</th>
                    <th className="text-right py-2">마켓 수</th>
                    <th className="text-right py-2">거래량</th>
                    <th className="text-right py-2">평균 Cost</th>
                    <th className="text-right py-2">수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {data.updownCoinStats.map((s) => (
                    <tr key={`${s.coin}-${s.timeframe}`} className="border-b border-border/50">
                      <td className="py-2 font-medium">{s.coin}</td>
                      <td className="py-2 text-muted-foreground">{s.timeframe}</td>
                      <td className="text-right py-2">{s.marketCount}</td>
                      <td className="text-right py-2">{formatCurrency(s.totalVolume)}</td>
                      <td className="text-right py-2">{s.avgPairCost.toFixed(4)}</td>
                      <td className={`text-right py-2 ${s.profitableRate > 0.5 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPercent(s.profitableRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top 20 Markets by Volume */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">투입금 Top 20 마켓</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            USDC 투입금 기준 상위 20개 마켓. 초록=수익 페어, 빨강=손실 페어.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={data.topMarkets}
              layout="vertical"
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} stroke="hsl(220 10% 40%)" fontSize={11} />
              <YAxis
                type="category"
                dataKey="title"
                width={150}
                tickFormatter={(v) => v.length > 25 ? v.slice(0, 25) + '…' : v}
                stroke="hsl(220 10% 40%)"
                fontSize={10}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number | undefined) => [formatCurrency(value ?? 0), '투입금']}
              />
              <Bar
                dataKey="capitalInvested"
                name="투입금"
                radius={[0, 2, 2, 0]}
              >
                {data.topMarkets.map((entry, idx) => (
                  <Cell key={idx} fill={entry.isProfitable ? COLORS.profit : COLORS.loss} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
}
