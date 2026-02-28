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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TOOLTIP_STYLE } from '@/lib/constants';
import { formatPercent } from '@/lib/utils';
import type { LegEntryAnalysis } from '@/lib/types';

interface LegEntryCardProps {
  data: LegEntryAnalysis;
}

export function LegEntryCard({ data }: LegEntryCardProps) {
  if (data.pairs.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          레그 진입가 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  const chartData = data.firstLegPriceDist.filter(
    (d) => d.firstLegCount > 0 || d.secondLegCount > 0
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">레그별 진입가 분석</CardTitle>
          <p className="text-xs text-muted-foreground">첫 번째/두 번째 매수의 가격 차이</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">평균 1차 매수가</p>
              <p className="text-xl font-bold text-purple-400">
                {(data.avgFirstLegPrice * 100).toFixed(1)}c
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">평균 2차 매수가</p>
              <p className="text-xl font-bold text-blue-400">
                {(data.avgSecondLegPrice * 100).toFixed(1)}c
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">평균 스프레드</p>
              <p className="text-xl font-bold">
                {(data.avgSpread * 100).toFixed(1)}c
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">저가 진입 비율</p>
              <p className="text-xl font-bold text-green-500">
                {formatPercent(data.cheapEntryRate)}
              </p>
              <p className="text-xs text-muted-foreground">1차 매수 &lt; 50c</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">진입가 분포: 1차 vs 2차 매수</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis dataKey="range" stroke="hsl(220 10% 40%)" fontSize={10} />
              <YAxis stroke="hsl(220 10% 40%)" fontSize={11} allowDecimals={false} />
              <Tooltip
                {...TOOLTIP_STYLE}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [value, name]}
              />
              <Legend />
              <Bar dataKey="firstLegCount" name="1차 매수" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="secondLegCount" name="2차 매수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pair Detail Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">진입가별 헤지 페어</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.pairs
            .slice()
            .sort((a, b) => a.pairCost - b.pairCost)
            .slice(0, 15)
            .map((pair, idx) => (
              <div key={pair.conditionId}>
                {idx > 0 && <Separator className="mb-3" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={pair.title}>{pair.title}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span>
                        1st ({pair.firstLeg}):{' '}
                        <span className="text-purple-400 font-medium">
                          {(pair.firstLegAvgPrice * 100).toFixed(1)}c
                        </span>
                        {' '}× {pair.firstLegSize.toFixed(0)}
                      </span>
                      <span>
                        2nd ({pair.firstLeg === 'YES' ? 'NO' : 'YES'}):{' '}
                        <span className="text-blue-400 font-medium">
                          {(pair.secondLegAvgPrice * 100).toFixed(1)}c
                        </span>
                        {' '}× {pair.secondLegSize.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <Badge className={pair.pairCost < 1
                      ? 'bg-green-500/20 text-green-500 border-green-500/30'
                      : 'bg-red-500/20 text-red-500 border-red-500/30'
                    }>
                      Cost {pair.pairCost.toFixed(4)}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Spread: {(pair.spread * 100).toFixed(1)}c
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
