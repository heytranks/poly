'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { COLORS, TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { PositionSizingAnalysis } from '@/lib/types';

interface SizingPanelProps {
  data: PositionSizingAnalysis;
}

export function SizingPanel({ data }: SizingPanelProps) {
  if (data.histogram.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          포지션 사이징 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="평균 투입금"
          value={formatCurrency(data.mean)}
          subValue={`중앙값: ${formatCurrency(data.median)}`}
        />
        <StatCard
          label="표준편차"
          value={formatCurrency(data.stdDev)}
          subValue={`CV: ${data.cv.toFixed(2)}`}
        />
        <StatCard
          label="사이즈-코스트 상관"
          value={data.correlation.toFixed(4)}
          subValue={Math.abs(data.correlation) > 0.3 ? '유의미한 상관' : '약한 상관'}
        />
        <StatCard
          label="라운드 넘버"
          value={data.roundNumberMode !== null ? data.roundNumberMode.toString() : 'N/A'}
          subValue={`비율: ${formatPercent(data.roundNumberRate)}`}
        />
      </div>

      {/* Size Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">투입금 분포</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            페어당 총 USDC 투입금(YES+NO 매수 합산) 분포. CV(변동계수)가 낮으면 고정 사이징 전략.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.histogram} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="range"
                stroke="hsl(220 10% 40%)"
                fontSize={10}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="hsl(220 10% 40%)" fontSize={11} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" name="페어 수" fill={COLORS.accent} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Size vs Pair Cost Scatter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">투입금 vs Pair Cost</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            X축: Pair Cost, Y축: 투입금. 상관이 높으면 스프레드가 넓을수록 더 많이 투입하는 전략.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="pairCost"
                name="Pair Cost"
                type="number"
                domain={['dataMin - 0.02', 'dataMax + 0.02']}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <YAxis
                dataKey="capitalInvested"
                name="투입금"
                tickFormatter={(v) => `$${v}`}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <ZAxis range={[30, 30]} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number | undefined) => [(value ?? 0).toFixed(4)]}
              />
              <Scatter data={data.sizeVsCost} fill={COLORS.accent} />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-1">
            상관계수: {data.correlation.toFixed(4)}
          </p>
        </CardContent>
      </Card>

      {/* Weekly Size Trend */}
      {data.weeklyTrend.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">주 단위 평균 투입금 추이</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              주별 평균 투입금 변화. 상승 추세면 스케일업, 하락이면 축소 중.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.weeklyTrend} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="sizeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
                <XAxis
                  dataKey="weekLabel"
                  stroke="hsl(220 10% 40%)"
                  fontSize={10}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(v) => `$${v}`}
                  stroke="hsl(220 10% 40%)"
                  fontSize={11}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number | undefined) => [formatCurrency(value ?? 0), '평균 투입금']}
                />
                <Area
                  type="monotone"
                  dataKey="avgSize"
                  name="평균 투입금"
                  stroke={COLORS.accent}
                  fill="url(#sizeGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
