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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TOOLTIP_STYLE } from '@/lib/constants';
import type { TimePriceAnalysis, HedgeTimingCategory } from '@/lib/types';

interface TimePriceCardProps {
  data: TimePriceAnalysis;
}

const CATEGORY_COLORS: Record<HedgeTimingCategory, string> = {
  simultaneous: '#22c55e',
  quick: '#a855f7',
  gradual: '#eab308',
  delayed: '#ef4444',
};

function formatGap(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      backgroundColor: '#1a1528',
      border: '1px solid #2e2545',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '12px',
      color: '#e2e8f0',
    }}>
      <p className="font-medium text-xs mb-1 max-w-[200px] truncate">{d.title}</p>
      <p>Gap: {formatGap(d.gapMinutes)}</p>
      <p>Pair Cost: <span style={{ color: d.pairCost < 1 ? '#22c55e' : '#ef4444' }}>
        {d.pairCost.toFixed(4)}
      </span></p>
      <p>1st Leg ({d.firstLeg}): {(d.firstLegPrice * 100).toFixed(1)}c</p>
      <p>2nd Leg: {(d.secondLegPrice * 100).toFixed(1)}c</p>
    </div>
  );
}

export function TimePriceCard({ data }: TimePriceCardProps) {
  if (data.pairs.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          시간-가격 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  const corrLabel =
    Math.abs(data.correlation) < 0.2 ? '상관없음' :
    Math.abs(data.correlation) < 0.5 ? '약한' :
    Math.abs(data.correlation) < 0.7 ? '보통' : '강한';
  const corrDir = data.correlation > 0 ? '양의 상관' : data.correlation < 0 ? '음의 상관' : '';

  // Chart data: avg pair cost by category
  const barData = data.buckets.filter((b) => b.count > 0);

  // Scatter: gapMinutes vs pairCost (log scale for gap)
  const scatterData = data.pairs.map((p) => ({
    ...p,
    logGap: p.gapMinutes > 0 ? Math.log10(p.gapMinutes + 1) : 0,
  }));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">시간-가격 관계</CardTitle>
          <p className="text-xs text-muted-foreground">매수 간격이 페어 코스트에 미치는 영향</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">간격 ↔ 코스트 상관관계</p>
              <p className="text-xl font-bold">{data.correlation.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">{corrLabel} {corrDir}</p>
            </div>
            {barData.map((b) => (
              <div key={b.category}>
                <p className="text-sm text-muted-foreground">{b.label}</p>
                <p className="text-lg font-bold" style={{ color: CATEGORY_COLORS[b.category] }}>
                  Cost {b.avgPairCost.toFixed(4)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {b.count} pairs · {(b.profitableRate * 100).toFixed(0)}% profitable
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Avg Pair Cost by Timing Category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">타이밍별 평균 페어 코스트</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis dataKey="label" stroke="hsl(220 10% 40%)" fontSize={11} />
              <YAxis
                domain={[0.8, 1.1]}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [Number(value).toFixed(4), 'Avg Pair Cost']}
              />
              <Bar dataKey="avgPairCost" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[entry.category]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scatter: Gap vs Pair Cost */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">시간 간격 vs 페어 코스트 (점 1개 = 페어 1개)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="logGap"
                name="Time Gap"
                type="number"
                tickFormatter={(v) => {
                  const mins = Math.pow(10, v) - 1;
                  return formatGap(mins);
                }}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
                label={{ value: 'Time Gap', position: 'bottom', fill: 'hsl(220 10% 40%)', fontSize: 11 }}
              />
              <YAxis
                dataKey="pairCost"
                name="Pair Cost"
                type="number"
                domain={['auto', 'auto']}
                tickFormatter={(v) => v.toFixed(2)}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <ZAxis range={[30, 30]} />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter data={scatterData} fillOpacity={0.7}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={entry.pairCost < 1 ? '#22c55e' : '#ef4444'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-2">
            초록 = 수익 (코스트 &lt; $1), 빨강 = 손실. X축은 로그 스케일.
          </p>
        </CardContent>
      </Card>

      {/* Detail table: Entry prices by timing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">페어별 진입가 & 타이밍</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.pairs
            .slice()
            .sort((a, b) => a.pairCost - b.pairCost)
            .slice(0, 10)
            .map((pair, idx) => (
              <div key={pair.conditionId}>
                {idx > 0 && <Separator className="mb-3" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" title={pair.title}>{pair.title}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span>
                        1st ({pair.firstLeg}): {(pair.firstLegPrice * 100).toFixed(1)}c
                      </span>
                      <span>
                        2nd: {(pair.secondLegPrice * 100).toFixed(1)}c
                      </span>
                      <span>Gap: {formatGap(pair.gapMinutes)}</span>
                    </div>
                  </div>
                  <Badge
                    className="shrink-0"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[pair.category]}20`,
                      color: CATEGORY_COLORS[pair.category],
                      borderColor: `${CATEGORY_COLORS[pair.category]}50`,
                    }}
                  >
                    Cost {pair.pairCost.toFixed(4)}
                  </Badge>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
