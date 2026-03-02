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
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { COLORS, TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { PositionSizingAnalysis, ProfitStructureAnalysis } from '@/lib/types';

interface SizingProfitPanelProps {
  sizing: PositionSizingAnalysis;
  profit: ProfitStructureAnalysis;
}

export function SizingProfitPanel({ sizing, profit }: SizingProfitPanelProps) {
  return (
    <div className="space-y-4">
      {/* Combined summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="평균 투입금"
          value={formatCurrency(sizing.mean)}
          subValue={`중앙값: ${formatCurrency(sizing.median)}`}
        />
        <StatCard
          label="투입금 CV"
          value={sizing.cv.toFixed(2)}
          subValue={sizing.cv < 0.3 ? '고정 사이징' : sizing.cv < 0.6 ? '변동 사이징' : '불규칙'}
        />
        <StatCard
          label="총 확정수익"
          value={formatCurrency(profit.totalLockedProfit)}
          trend={profit.totalLockedProfit > 0 ? 'up' : 'down'}
        />
        <StatCard
          label="자본 효율"
          value={formatPercent(profit.capitalEfficiency)}
          subValue={`PF: ${profit.profitFactor === Infinity ? '∞' : profit.profitFactor.toFixed(2)}`}
        />
      </div>

      {/* Size Distribution + Margin Distribution side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">투입금 분포</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              페어당 총 USDC 투입금 분포.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sizing.histogram} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
                <XAxis dataKey="range" stroke="hsl(220 10% 40%)" fontSize={10} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="hsl(220 10% 40%)" fontSize={11} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="페어 수" fill={COLORS.accent} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">마진 분포 (1 - Pair Cost)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              양수=수익 마진, 음수=초과 비용.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={profit.marginHistogram} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
                <XAxis dataKey="range" stroke="hsl(220 10% 40%)" fontSize={10} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis stroke="hsl(220 10% 40%)" fontSize={11} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="count" name="페어 수" radius={[2, 2, 0, 0]}>
                  {profit.marginHistogram.map((entry, idx) => (
                    <Cell key={idx} fill={entry.min >= 0 ? COLORS.profit : COLORS.loss} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Size vs Pair Cost Scatter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">투입금 vs Pair Cost</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            상관이 높으면 스프레드가 넓을수록 더 많이 투입. 상관계수: {sizing.correlation.toFixed(4)}
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis dataKey="pairCost" name="Pair Cost" type="number" domain={['dataMin - 0.02', 'dataMax + 0.02']} stroke="hsl(220 10% 40%)" fontSize={11} />
              <YAxis dataKey="capitalInvested" name="투입금" tickFormatter={(v) => `$${v}`} stroke="hsl(220 10% 40%)" fontSize={11} />
              <ZAxis range={[30, 30]} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value: number | undefined) => [(value ?? 0).toFixed(4)]} />
              <Scatter data={sizing.sizeVsCost} fill={COLORS.accent} />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Pairs Cost Breakdown */}
      {profit.topPairsCostBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">상위 페어 YES/NO 가격 분해</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              수익 상위 20개 페어. 합산 1.00 미만 = 수익 구간.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(300, profit.topPairsCostBreakdown.length * 25)}>
              <BarChart data={profit.topPairsCostBreakdown} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
                <XAxis type="number" domain={[0, 1.1]} stroke="hsl(220 10% 40%)" fontSize={11} />
                <YAxis type="category" dataKey="title" width={150} tickFormatter={(v) => v.length > 25 ? v.slice(0, 25) + '…' : v} stroke="hsl(220 10% 40%)" fontSize={10} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(value: number | undefined) => [(value ?? 0).toFixed(4)]} />
                <Bar dataKey="avgYesPrice" name="YES 가격" stackId="cost" fill={COLORS.yes} />
                <Bar dataKey="avgNoPrice" name="NO 가격" stackId="cost" fill={COLORS.no} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
