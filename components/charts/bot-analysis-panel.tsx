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
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TOOLTIP_STYLE, COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { BotAnalysis } from '@/lib/types';

interface BotAnalysisPanelProps {
  data: BotAnalysis;
}

export function BotAnalysisPanel({ data }: BotAnalysisPanelProps) {
  return (
    <div className="space-y-4">
      <OverviewCard data={data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EntryOddsChart data={data} />
        <CoinBreakdownChart data={data} />
      </div>
    </div>
  );
}

// ── Card 1: Overview ──

function OverviewCard({ data }: { data: BotAnalysis }) {
  const { overview } = data;
  const total = overview.upBets + overview.downBets;
  const upRatio = total > 0 ? overview.upBets / total : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Bot Overview</CardTitle>
          <Badge variant="outline" className="text-xs">UpDown 5m</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          5분 안에 코인 가격이 오를지(Up) 내릴지(Down) 맞추는 마켓의 베팅 패턴
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">총 마켓</p>
            <p className="text-lg font-semibold">{overview.totalMarkets}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">평균 매수 배당률</p>
            <p className="text-lg font-semibold">{(overview.avgEntryOdds * 100).toFixed(1)}c</p>
            <p className="text-[10px] text-muted-foreground">낮을수록 저렴하게 진입</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">총 거래액</p>
            <p className="text-lg font-semibold">{formatCurrency(overview.totalVolume)}</p>
          </div>
        </div>

        {/* Up vs Down breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-green-500/10 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-500">Up 베팅</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{overview.upBets}건</span>
              <span>{total > 0 ? (upRatio * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-500">Down 베팅</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{overview.downBets}건</span>
              <span>{total > 0 ? ((1 - upRatio) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Card 2: Entry Odds Distribution ──

function EntryOddsChart({ data }: { data: BotAnalysis }) {
  const buckets = data.entryOdds.filter((b) => b.count > 0);

  if (buckets.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No entry odds data
        </CardContent>
      </Card>
    );
  }

  const chartData = buckets.map((b) => ({
    range: b.range,
    count: b.count,
    volume: b.totalVolume,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">진입 배당률 분포</CardTitle>
        <p className="text-xs text-muted-foreground">
          봇이 어떤 가격대에서 진입하는지. 보라색=거래 수, 파란색=거래액
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
            <XAxis dataKey="range" stroke="hsl(220 10% 40%)" fontSize={11} />
            <YAxis
              yAxisId="left"
              stroke="hsl(220 10% 40%)"
              fontSize={11}
              label={{ value: 'Trades', angle: -90, position: 'insideLeft', style: { fill: 'hsl(220 10% 40%)', fontSize: 10 } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => formatCurrency(v)}
              stroke="hsl(220 10% 40%)"
              fontSize={11}
              label={{ value: 'Volume', angle: 90, position: 'insideRight', style: { fill: 'hsl(220 10% 40%)', fontSize: 10 } }}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                if (name === 'volume') return [formatCurrency(value), 'Volume'];
                if (name === 'count') return [value, 'Trades'];
                return [value, name];
              }}
            />
            <Legend
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => value === 'count' ? 'Trades' : 'Volume'}
            />
            <Bar yAxisId="left" dataKey="count" fill={COLORS.accent} radius={[4, 4, 0, 0]} opacity={0.7} />
            <Bar yAxisId="right" dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Card 3: Coin Breakdown ──

function CoinBreakdownChart({ data }: { data: BotAnalysis }) {
  const coins = data.coinBreakdown;

  if (coins.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          No coin data
        </CardContent>
      </Card>
    );
  }

  const COIN_COLORS: Record<string, string> = {
    BTC: '#f7931a',
    ETH: '#627eea',
    SOL: '#9945ff',
    XRP: '#23292f',
    DOGE: '#c2a633',
    ADA: '#0033ad',
  };

  const chartData = coins.map((c) => ({
    coin: c.coin,
    count: c.count,
    volume: c.totalVolume,
    color: COIN_COLORS[c.coin] ?? COLORS.accent,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">코인별 거래 분포</CardTitle>
        <p className="text-xs text-muted-foreground">
          어떤 코인에서 많이 거래하는지
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
            <XAxis dataKey="coin" stroke="hsl(220 10% 40%)" fontSize={12} />
            <YAxis
              stroke="hsl(220 10% 40%)"
              fontSize={11}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                if (name === 'count') return [value, 'Markets'];
                return [value, name];
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} opacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Volume summary */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          {coins.map((c) => (
            <div key={c.coin} className="flex items-center gap-1">
              <span className="font-medium">{c.coin}:</span>
              <span>{c.count}건</span>
              <span className="text-muted-foreground">
                ({formatCurrency(c.totalVolume)})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
