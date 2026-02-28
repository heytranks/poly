'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { MarketSelectionAnalysis } from '@/lib/types';

interface MarketSelectionCardProps {
  data: MarketSelectionAnalysis;
}

const COLORS = {
  hedged: '#7c3aed',
  single: '#94a3b8',
};

export function MarketSelectionCard({ data }: MarketSelectionCardProps) {
  const total = data.hedged.marketCount + data.singleDirection.marketCount;
  if (total === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          마켓 선택 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  const barData = [
    {
      name: '총 손익',
      헤지: data.hedged.totalPnl,
      단방향: data.singleDirection.totalPnl,
    },
    {
      name: '평균 손익',
      헤지: data.hedged.avgPnlPerMarket,
      단방향: data.singleDirection.avgPnlPerMarket,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Side-by-side stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">마켓 선택: 헤지 vs 단방향</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* Hedged */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.hedged }} />
                <span className="font-semibold" style={{ color: COLORS.hedged }}>헤지</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">마켓 수</span>
                  <span>{data.hedged.marketCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">총 손익</span>
                  <span className={data.hedged.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(data.hedged.totalPnl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">평균 손익</span>
                  <span className={data.hedged.avgPnlPerMarket >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(data.hedged.avgPnlPerMarket)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">승률</span>
                  <span>{formatPercent(data.hedged.winRate)}</span>
                </div>
              </div>
            </div>

            {/* Single Direction */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.single }} />
                <span className="font-semibold" style={{ color: COLORS.single }}>단방향</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">마켓 수</span>
                  <span>{data.singleDirection.marketCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">총 손익</span>
                  <span className={data.singleDirection.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(data.singleDirection.totalPnl)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">평균 손익</span>
                  <span className={data.singleDirection.avgPnlPerMarket >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatCurrency(data.singleDirection.avgPnlPerMarket)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">승률</span>
                  <span>{formatPercent(data.singleDirection.winRate)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PnL Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">손익 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis dataKey="name" stroke="hsl(220 10% 40%)" fontSize={12} />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number | undefined) => [formatCurrency(value ?? 0)]}
              />
              <Legend />
              <Bar dataKey="헤지" fill={COLORS.hedged} radius={[4, 4, 0, 0]} />
              <Bar dataKey="단방향" fill={COLORS.single} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Win Rate Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">승률 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">헤지</p>
              <p className="text-3xl font-bold" style={{ color: COLORS.hedged }}>
                {formatPercent(data.hedged.winRate)}
              </p>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${data.hedged.winRate * 100}%`,
                    backgroundColor: COLORS.hedged,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {data.hedged.winCount}W / {data.hedged.lossCount}L
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">단방향</p>
              <p className="text-3xl font-bold" style={{ color: COLORS.single }}>
                {formatPercent(data.singleDirection.winRate)}
              </p>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${data.singleDirection.winRate * 100}%`,
                    backgroundColor: COLORS.single,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {data.singleDirection.winCount}W / {data.singleDirection.lossCount}L
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
