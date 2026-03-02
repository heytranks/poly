'use client';

import { useMemo } from 'react';
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
import { COLORS, TOOLTIP_STYLE } from '@/lib/constants';
import { formatPercent } from '@/lib/utils';
import { analyzeBotLogic } from '@/lib/analyzers/bot-logic';
import type { PriceContextMarket, BotLogicInsight } from '@/lib/types';

interface BotLogicSectionProps {
  markets: PriceContextMarket[];
}

/** Deterministic jitter: hash index to stable float in ~[-0.15, 0.15) */
function jitter(i: number): number {
  return ((((i * 2654435761) >>> 0) / 4294967296) - 0.5) * 0.3;
}

function InsightCard({ insight }: { insight: BotLogicInsight }) {
  const borderColor = insight.type === 'positive'
    ? 'border-l-green-500'
    : insight.type === 'negative'
      ? 'border-l-red-500'
      : 'border-l-slate-500';
  const bgColor = insight.type === 'positive'
    ? 'bg-green-500/5'
    : insight.type === 'negative'
      ? 'bg-red-500/5'
      : 'bg-slate-500/5';

  return (
    <div className={`border-l-4 ${borderColor} ${bgColor} rounded-r-lg px-4 py-3`}>
      <p className="text-sm font-semibold">{insight.title}</p>
      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
    </div>
  );
}

export function BotLogicSection({ markets }: BotLogicSectionProps) {
  const analysis = useMemo(() => analyzeBotLogic(markets), [markets]);

  const { upScatter, downScatter } = useMemo(() => {
    if (!analysis) return { upScatter: [] as { pctChange: number; sideValue: number; side: string; key: number }[], downScatter: [] as { pctChange: number; sideValue: number; side: string; key: number }[] };
    const scatterBase = analysis.tradeContexts.map((c, i) => ({
      pctChange: Math.round(c.pctChangeFromOpen * 1000) / 1000,
      sideValue: (c.side === 'Up' ? 1 : -1) + jitter(i),
      side: c.side,
      key: i,
    }));
    const up = scatterBase.filter((d) => d.side === 'Up');
    const down = scatterBase.filter((d) => d.side === 'Down');
    return { upScatter: up, downScatter: down };
  }, [analysis]);

  const triggerData = useMemo(() => analysis?.triggerHistogram.map((b) => ({
    range: b.range,
    upCount: b.upCount,
    downCount: b.downCount,
    total: b.count,
  })) ?? [], [analysis]);

  const timingData = useMemo(() => analysis?.timingHistogram.map((b) => ({
    range: b.range,
    count: b.count,
  })) ?? [], [analysis]);

  if (!analysis) return null;

  const corrLabel = analysis.momentumCorrelation >= 0
    ? `+${analysis.momentumCorrelation.toFixed(2)}`
    : analysis.momentumCorrelation.toFixed(2);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div>
        <h3 className="text-lg font-semibold">봇 로직 분석</h3>
        <p className="text-xs text-muted-foreground">
          {analysis.totalMarketsAnalyzed}개 마켓, {analysis.totalTradesAnalyzed}건 거래 기반
        </p>
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">로직 해석</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* A. StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="방향 전략"
          value={analysis.directionLabel}
          subValue={`상관계수 ${corrLabel}`}
        />
        <StatCard
          label="트리거 중앙값"
          value={`${analysis.medianTriggerPct.toFixed(3)}%`}
          subValue="직전 구간 변동률"
        />
        <StatCard
          label="첫 진입 방향"
          value={`${Math.round(analysis.upFirstRate * 100)}% Up`}
          subValue={`가격 추종 ${formatPercent(analysis.firstLegFollowsPrice)}`}
        />
        <StatCard
          label="진입 타이밍"
          value={`${Math.round(analysis.medianElapsedPct * 100)}%`}
          subValue="윈도우 진행률 중앙값"
        />
        {analysis.avgPairCost !== null && (
          <StatCard
            label="평균 Pair Cost"
            value={analysis.avgPairCost.toFixed(4)}
            subValue={analysis.avgPairCost < 1 ? '확정 수익 구조' : '손실 구조'}
            trend={analysis.avgPairCost < 1 ? 'up' : 'down'}
          />
        )}
      </div>

      {/* B. Direction Scatter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">가격 변동 vs 거래 방향</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            X축: 윈도우 시작 대비 가격 변동률(%). 모멘텀이면 상승시 Up 매수, 역추세면 반대.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="pctChange"
                name="변동률%"
                type="number"
                stroke="hsl(220 10% 40%)"
                fontSize={11}
                label={{ value: '가격 변동률 (%)', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: '#94a3b8' } }}
              />
              <YAxis
                dataKey="sideValue"
                name="Side"
                type="number"
                domain={[-2, 2]}
                stroke="hsl(220 10% 40%)"
                fontSize={11}
                ticks={[-1, 1]}
                tickFormatter={(v) => (v > 0 ? 'Up' : 'Down')}
              />
              <ZAxis range={[30, 30]} />
              <ReferenceLine x={0} stroke={COLORS.neutral} strokeDasharray="3 3" />
              <Tooltip
                {...TOOLTIP_STYLE}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={TOOLTIP_STYLE.contentStyle} className="p-2">
                      <p className="text-xs">방향: <span style={{ color: d.side === 'Up' ? COLORS.yes : COLORS.no }}>{d.side}</span></p>
                      <p className="text-xs">변동률: {d.pctChange.toFixed(3)}%</p>
                    </div>
                  );
                }}
              />
              <Scatter data={upScatter} fill={COLORS.yes} fillOpacity={0.6} />
              <Scatter data={downScatter} fill={COLORS.no} fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span><span className="text-green-500">●</span> Up 매수 (가격↑시 {formatPercent(analysis.upWhenRising)})</span>
            <span><span className="text-red-500">●</span> Down 매수 (가격↓시 {formatPercent(analysis.downWhenFalling)})</span>
          </div>
        </CardContent>
      </Card>

      {/* C. Trigger Distribution (Stacked Bar) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">트리거 분포</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            직전 구간 가격 변동률(절대값) 분포. 봇이 반응하는 가격 변동 크기를 나타냄.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={triggerData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="range"
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <YAxis stroke="hsl(220 10% 40%)" fontSize={11} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value?: number, name?: string) => [value ?? 0, name === 'upCount' ? 'Up' : 'Down']}
              />
              <Bar dataKey="upCount" stackId="a" name="Up" fill={COLORS.yes} fillOpacity={0.8} radius={[0, 0, 0, 0]} />
              <Bar dataKey="downCount" stackId="a" name="Down" fill={COLORS.no} fillOpacity={0.8} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center">
            <span className="text-green-500">■</span> Up
            {' · '}
            <span className="text-red-500">■</span> Down
            {' · '}
            중앙값: {analysis.medianTriggerPct.toFixed(3)}%
          </p>
        </CardContent>
      </Card>

      {/* D. Entry Timing Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">진입 타이밍 분포</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            각 마켓에서 첫 거래의 윈도우 진행률. 0%=윈도우 시작, 100%=윈도우 끝.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={timingData} margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
              <XAxis
                dataKey="range"
                stroke="hsl(220 10% 40%)"
                fontSize={11}
              />
              <YAxis stroke="hsl(220 10% 40%)" fontSize={11} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" name="마켓 수" fill={COLORS.accent} fillOpacity={0.8} radius={[2, 2, 0, 0]}>
                {timingData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS.accent} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center">
            중앙값: 윈도우 {Math.round(analysis.medianElapsedPct * 100)}% 시점
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
