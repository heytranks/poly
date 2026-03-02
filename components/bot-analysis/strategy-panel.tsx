'use client';

import { useState } from 'react';
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
  ReferenceLine,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { Badge } from '@/components/ui/badge';
import { COLORS, TOOLTIP_STYLE } from '@/lib/constants';
import { formatCurrency, formatPercent, formatDateTime } from '@/lib/utils';
import type { StrategyProfitabilityAnalysis, ExecutionAnalysis } from '@/lib/types';
import type { HedgePair } from '@/lib/utils/hedge-pairs';

interface StrategyPanelProps {
  profitability: StrategyProfitabilityAnalysis;
  execution: ExecutionAnalysis;
  hedgePairs: HedgePair[];
}

export function StrategyPanel({ profitability, execution, hedgePairs }: StrategyPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (profitability.totalPairs === 0 && execution.sizeBalance.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          헷지 페어 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- 1-1. Summary stats ---
  const avgBalanceRatio =
    execution.sizeBalance.length > 0
      ? execution.sizeBalance.reduce((s, p) => s + p.ratio, 0) / execution.sizeBalance.length
      : 0;

  // --- 1-2. Pair Cost histogram ---
  const histogramData = profitability.histogram.map((b) => ({
    ...b,
    label: b.max === Infinity ? '1.05+' : b.max.toFixed(2),
  }));

  // --- 1-3. Timing vs Cost scatter data ---
  const timingVsCostData = hedgePairs.map((p) => ({
    gapSeconds: Math.round(p.gapMinutes * 60),
    pairCost: p.pairCost,
    isProfitable: p.isProfitable,
    title: p.title,
  }));

  // --- 1-6. Recent timelines enriched with hedge pair data ---
  const pairMap = new Map(hedgePairs.map((p) => [p.conditionId, p]));
  const recentTimelines = execution.recentTimelines.slice(0, 15);

  return (
    <div className="space-y-4">
      {/* 1-1. Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="수익 페어"
          value={`${profitability.profitablePairs} / ${profitability.totalPairs}`}
          subValue={`수익률: ${formatPercent(profitability.profitableRate)}`}
          trend={profitability.profitableRate > 0.5 ? 'up' : 'down'}
        />
        <StatCard
          label="순 결과"
          value={formatCurrency(profitability.netResult)}
          subValue={`수익 ${formatCurrency(profitability.totalLockedProfit)} / 손실 ${formatCurrency(profitability.totalLoss)}`}
          trend={profitability.netResult > 0 ? 'up' : 'down'}
        />
        <StatCard
          label="평균 Pair Cost"
          value={profitability.avgPairCost.toFixed(4)}
          subValue={profitability.avgPairCost < 1 ? '평균적으로 수익' : '평균적으로 손실'}
          trend={profitability.avgPairCost < 1 ? 'up' : 'down'}
        />
        <StatCard
          label="평균 밸런스 비율"
          value={formatPercent(avgBalanceRatio)}
          subValue="min/max shares"
        />
      </div>

      {/* 1-2. Pair Cost Histogram */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Pair Cost 분포</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Pair Cost = YES 매수 평균가 + NO 매수 평균가. 1.00 미만이면 확정 수익, 이상이면 확정 손실.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1 px-2">
            <span>X축: Pair Cost 구간 (0.01 단위)</span>
            <span>Y축: 해당 구간의 헷지 페어 수</span>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={histogramData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="label"
                stroke="hsl(220 10% 40%)"
                fontSize={11}
                interval={1}
                tick={{ dy: 4 }}
              />
              <YAxis stroke="hsl(220 10% 40%)" fontSize={11} />
              <Tooltip
                {...TOOLTIP_STYLE}
                labelFormatter={(label) => {
                  const item = histogramData.find((b) => b.label === label);
                  return item ? item.range : String(label);
                }}
              />
              <Bar dataKey="count" name="페어 수" radius={[2, 2, 0, 0]}>
                {histogramData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.max <= 1.0 ? COLORS.profit : COLORS.loss}
                    fillOpacity={entry.max <= 1.0 ? 0.85 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center">
            <span className="text-green-500">■</span> Pair Cost {'<'} 1.00 (수익)
            {' · '}
            <span className="text-red-500">■</span> Pair Cost ≥ 1.00 (손실)
          </p>
        </CardContent>
      </Card>

      {/* 1-3. Timing vs Pair Cost Scatter */}
      {timingVsCostData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">레그 타이밍 vs Pair Cost</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              빠른 실행(왼쪽)이 낮은 Pair Cost(아래)와 상관 있으면 속도가 수익에 직결
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1 px-2">
              <span>X축: 레그 간 시간 차이 (초)</span>
              <span>Y축: Pair Cost</span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
                <XAxis
                  dataKey="gapSeconds"
                  name="타이밍 (초)"
                  stroke="hsl(220 10% 40%)"
                  fontSize={11}
                  type="number"
                />
                <YAxis
                  dataKey="pairCost"
                  name="Pair Cost"
                  stroke="hsl(220 10% 40%)"
                  fontSize={11}
                  domain={['auto', 'auto']}
                />
                <ZAxis range={[40, 40]} />
                <ReferenceLine y={1.0} stroke={COLORS.neutral} strokeDasharray="3 3" label={{ value: '1.00', position: 'right', fill: COLORS.neutral, fontSize: 11 }} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={TOOLTIP_STYLE.contentStyle} className="p-2">
                        <p className="text-xs font-medium truncate max-w-[200px]">{d.title}</p>
                        <p className="text-xs">타이밍: {d.gapSeconds}초</p>
                        <p className="text-xs">Pair Cost: {d.pairCost.toFixed(4)}</p>
                      </div>
                    );
                  }}
                />
                <Scatter data={timingVsCostData.filter((d) => d.isProfitable)} fill={COLORS.profit} fillOpacity={0.7} />
                <Scatter data={timingVsCostData.filter((d) => !d.isProfitable)} fill={COLORS.loss} fillOpacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center">
              <span className="text-green-500">●</span> 수익 (Pair Cost {'<'} 1.00)
              {' · '}
              <span className="text-red-500">●</span> 손실 (Pair Cost ≥ 1.00)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Size Balance Scatter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">사이즈 밸런스 (YES vs NO shares)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            각 페어의 YES/NO 매수 수량 비교. 대각선에 가까울수록 균형 잡힌 헷지. 한쪽으로 치우치면 방향성 베팅 성격.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="yesShares"
                name="YES Shares"
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <YAxis
                dataKey="noShares"
                name="NO Shares"
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <ZAxis range={[30, 30]} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number | undefined) => [(value ?? 0).toFixed(2)]}
              />
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  {
                    x: Math.max(...execution.sizeBalance.map((p) => Math.max(p.yesShares, p.noShares))),
                    y: Math.max(...execution.sizeBalance.map((p) => Math.max(p.yesShares, p.noShares))),
                  },
                ]}
                stroke={COLORS.neutral}
                strokeDasharray="3 3"
              />
              <Scatter data={execution.sizeBalance} fill={COLORS.accent} />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 1-6. Recent Execution Timeline (Accordion) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">최근 실행 타임라인</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {recentTimelines.map((timeline) => {
              const isExpanded = expandedIds.has(timeline.conditionId);
              const pair = pairMap.get(timeline.conditionId);
              const pairCost = pair?.pairCost;
              const gapSeconds = pair ? Math.round(pair.gapMinutes * 60) : null;
              const profit = pair ? (pair.isProfitable ? pair.lockedProfit : -(pair.hedgedSize * (pair.pairCost - 1))) : null;
              const isProfitable = pair?.isProfitable ?? false;

              return (
                <div key={timeline.conditionId}>
                  <button
                    onClick={() => toggleExpanded(timeline.conditionId)}
                    className="w-full flex items-center gap-2 text-sm py-2 px-3 rounded-md hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="text-muted-foreground shrink-0">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <span className="truncate flex-1 font-medium" title={timeline.title}>
                      {timeline.title}
                    </span>
                    {pairCost != null && (
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {pairCost.toFixed(4)}
                      </span>
                    )}
                    {gapSeconds != null && (
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {gapSeconds}초
                      </span>
                    )}
                    {profit != null && (
                      <span className={`text-xs shrink-0 font-medium tabular-nums ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                        {isProfitable ? '+' : ''}{formatCurrency(profit)}
                      </span>
                    )}
                    <span className="text-xs shrink-0">
                      {isProfitable ? (
                        <span className="text-green-500">✓수익</span>
                      ) : (
                        <span className="text-red-500">✗손실</span>
                      )}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-6 pl-3 border-l border-border space-y-1 pb-2">
                      {timeline.fills.map((fill, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground w-[140px] shrink-0">
                            {formatDateTime(new Date(fill.timestamp * 1000))}
                          </span>
                          <Badge
                            variant={fill.side === 'YES' ? 'default' : 'secondary'}
                            className="text-xs w-10 justify-center"
                          >
                            {fill.side}
                          </Badge>
                          <span className="tabular-nums">{fill.price.toFixed(2)}</span>
                          <span className="text-muted-foreground tabular-nums">×{fill.size.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
