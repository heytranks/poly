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
import { StatCard } from '@/components/shared/stat-card';
import { COLORS, TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { ProfitStructureAnalysis } from '@/lib/types';

interface ProfitPanelProps {
  data: ProfitStructureAnalysis;
}

export function ProfitPanel({ data }: ProfitPanelProps) {
  if (data.profitHistogram.length === 0 && data.marginHistogram.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          수익 구조 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="총 확정수익"
          value={formatCurrency(data.totalLockedProfit)}
          trend={data.totalLockedProfit > 0 ? 'up' : 'down'}
        />
        <StatCard
          label="평균 마진"
          value={formatPercent(data.avgMargin)}
        />
        <StatCard
          label="자본 효율"
          value={formatPercent(data.capitalEfficiency)}
          subValue="수익 / 투입 자본"
        />
        <StatCard
          label="Profit Factor"
          value={data.profitFactor === Infinity ? '∞' : data.profitFactor.toFixed(2)}
          trend={data.profitFactor > 1 ? 'up' : 'down'}
        />
      </div>

      {/* Margin Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">마진 분포 (1 - Pair Cost)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            각 페어의 마진율. 양수=수익 마진, 음수=초과 비용. 봇이 타겟하는 마진 구간을 파악.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.marginHistogram} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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
              <Bar dataKey="count" name="페어 수" radius={[2, 2, 0, 0]}>
                {data.marginHistogram.map((entry, idx) => (
                  <Cell key={idx} fill={entry.min >= 0 ? COLORS.profit : COLORS.loss} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profit Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">페어당 수익 분포</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            각 페어에서 확정된 USDC 수익 금액의 분포. locked profit = hedgedSize × (1 - pairCost).
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.profitHistogram} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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
              <Bar dataKey="count" name="페어 수" fill={COLORS.profit} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Pairs Cost Breakdown */}
      {data.topPairsCostBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">상위 페어 YES/NO 가격 분해</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            수익 상위 20개 페어의 YES/NO VWAP 가격 구성. 합산이 1.00 미만이면 수익 구간.
          </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(300, data.topPairsCostBreakdown.length * 25)}>
              <BarChart
                data={data.topPairsCostBreakdown}
                layout="vertical"
                margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
                <XAxis type="number" domain={[0, 1.1]} stroke="hsl(220 10% 40%)" fontSize={11} />
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
                  formatter={(value: number | undefined) => [(value ?? 0).toFixed(4)]}
                />
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
