'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatCard } from '@/components/shared/stat-card';
import { COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import type { PriceContextAnalysis, PriceContextMarket } from '@/lib/types';

interface PriceContextPanelProps {
  data: PriceContextAnalysis;
}

/** Determine if Up won based on kline data (end price > start price) */
function didUpWin(market: PriceContextMarket): boolean | null {
  if (market.klineData.length < 2) return null;
  const first = market.klineData[0].price;
  const last = market.klineData[market.klineData.length - 1].price;
  if (first === last) return null; // exact tie, unknown
  return last > first;
}

/** Compute PnL for a market from its trades */
function computeMarketPnl(market: PriceContextMarket): {
  pnl: number | null;
  totalCost: number;
  isHedged: boolean;
  isResolved: boolean;
} {
  let upUsdc = 0, upShares = 0;
  let downUsdc = 0, downShares = 0;
  for (const t of market.trades) {
    const shares = t.price > 0 ? t.usdcSize / t.price : 0;
    if (t.side === 'Up') {
      upUsdc += t.usdcSize;
      upShares += shares;
    } else {
      downUsdc += t.usdcSize;
      downShares += shares;
    }
  }
  const totalCost = upUsdc + downUsdc;
  const isHedged = upShares > 0 && downShares > 0;
  const closed = isMarketClosed(market);

  if (isHedged) {
    // Hedged: locked PnL = min(upShares, downShares) - totalCost
    const hedged = Math.min(upShares, downShares);
    const lockedPnl = hedged - totalCost;

    if (closed) {
      // Resolved: calculate actual PnL including unhedged shares
      const upWon = didUpWin(market);
      if (upWon !== null) {
        const payout = upWon ? upShares * 1 : downShares * 1;
        return { pnl: payout - totalCost, totalCost, isHedged, isResolved: true };
      }
    }
    return { pnl: lockedPnl, totalCost, isHedged, isResolved: false };
  }

  // One-sided: need resolved outcome
  if (closed) {
    const upWon = didUpWin(market);
    if (upWon !== null) {
      const payout = upWon ? upShares * 1 : downShares * 1;
      return { pnl: payout - totalCost, totalCost, isHedged, isResolved: true };
    }
  }

  return { pnl: null, totalCost, isHedged, isResolved: false };
}

/** Check if market window has ended */
function isMarketClosed(market: PriceContextMarket): boolean {
  const endSec = market.windowStartSec + market.windowDurationSec;
  return Date.now() / 1000 > endSec;
}

/** Format elapsed time for X axis ticks based on window duration */
function formatElapsed(ms: number, windowDurationSec: number): string {
  const totalSec = Math.round(ms / 1000);
  if (windowDurationSec <= 300) {
    // 5m: show M:SS
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  if (windowDurationSec <= 3600) {
    // up to 1h: show MM:SS
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  // 4h+: show H:MM
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** Custom triangle marker for trade dots */
function TradeMarker({ cx, cy, side }: { cx?: number; cy?: number; side: 'Up' | 'Down' }) {
  if (cx == null || cy == null) return null;
  if (side === 'Up') {
    // Upward triangle
    return <polygon points={`${cx},${cy - 7} ${cx - 6},${cy + 5} ${cx + 6},${cy + 5}`} fill={COLORS.yes} stroke="#fff" strokeWidth={1} />;
  }
  // Diamond
  return <polygon points={`${cx},${cy - 7} ${cx + 6},${cy} ${cx},${cy + 7} ${cx - 6},${cy}`} fill={COLORS.no} stroke="#fff" strokeWidth={1} />;
}

interface MergedPoint {
  timestamp: number;
  price: number;
  pairCost?: number;
  netExposure?: number;   // cumUp - cumDown USDC (positive=long, negative=short)
  cumUpUsdc?: number;
  cumDownUsdc?: number;
  upVolume?: number;
  downVolume?: number;
  upCount?: number;
  downCount?: number;
  avgUpPrice?: number;    // volume-weighted avg Up trade price
  avgDownPrice?: number;  // volume-weighted avg Down trade price
  hasTrade?: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload, label, windowStart, windowDurationSec }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as MergedPoint | undefined;
  if (!d) return null;
  const elapsed = Number(label) - windowStart;
  const net = d.netExposure;
  const biasLabel = net != null
    ? net > 0.01 ? 'Long 편향' : net < -0.01 ? 'Short 편향' : '균형'
    : null;
  const biasColor = net != null
    ? net > 0.01 ? COLORS.yes : net < -0.01 ? COLORS.no : '#94a3b8'
    : '#94a3b8';
  return (
    <div style={{
      backgroundColor: '#1a1528', border: '1px solid #2e2545',
      borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#e2e8f0',
    }}>
      <div style={{ marginBottom: 4, color: '#94a3b8' }}>
        {formatElapsed(elapsed, windowDurationSec)}
      </div>
      <div>코인 가격: <span style={{ color: COLORS.accentLight }}>
        ${Number(d.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span></div>
      {(d.upCount ?? 0) > 0 && (
        <div style={{ color: COLORS.yes, marginTop: 2 }}>
          Up 매수: {d.upCount}건 / {formatCurrency(d.upVolume ?? 0)}
          {d.avgUpPrice != null && <span style={{ opacity: 0.8 }}> (avg {d.avgUpPrice.toFixed(4)})</span>}
        </div>
      )}
      {(d.downCount ?? 0) > 0 && (
        <div style={{ color: COLORS.no, marginTop: 2 }}>
          Down 매수: {d.downCount}건 / {formatCurrency(d.downVolume ?? 0)}
          {d.avgDownPrice != null && <span style={{ opacity: 0.8 }}> (avg {d.avgDownPrice.toFixed(4)})</span>}
        </div>
      )}
      {net != null && (
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid #2e2545' }}>
          <div>누적 Up: <span style={{ color: COLORS.yes }}>{formatCurrency(d.cumUpUsdc ?? 0)}</span>
            {' / '}Down: <span style={{ color: COLORS.no }}>{formatCurrency(d.cumDownUsdc ?? 0)}</span>
          </div>
          <div style={{ color: biasColor, marginTop: 2 }}>
            Net: {formatCurrency(Math.abs(net))} {biasLabel}
          </div>
        </div>
      )}
      {d.pairCost != null && (
        <div style={{ color: '#f59e0b', marginTop: 2 }}>
          Pair Cost: {d.pairCost.toFixed(4)}
        </div>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function DetailPriceChart({ market }: { market: PriceContextMarket }) {
  const windowStart = market.windowStartSec * 1000;
  const windowEnd = windowStart + market.windowDurationSec * 1000;

  // Merge trades into kline data: aggregate trades to nearest kline point
  const mergedData: MergedPoint[] = market.klineData.map((k) => ({
    timestamp: k.timestamp,
    price: k.price,
  }));

  // Track weighted price sums for average calculation
  const upPriceSum = new Map<number, number>();   // timestamp → sum(price * usdc)
  const downPriceSum = new Map<number, number>();

  for (const t of market.trades) {
    if (mergedData.length === 0) continue;
    const closest = mergedData.reduce((prev, curr) =>
      Math.abs(curr.timestamp - t.timestamp) < Math.abs(prev.timestamp - t.timestamp) ? curr : prev
    );
    closest.hasTrade = true;
    if (t.side === 'Up') {
      closest.upCount = (closest.upCount ?? 0) + 1;
      closest.upVolume = (closest.upVolume ?? 0) + t.usdcSize;
      upPriceSum.set(closest.timestamp, (upPriceSum.get(closest.timestamp) ?? 0) + t.price * t.usdcSize);
    } else {
      closest.downCount = (closest.downCount ?? 0) + 1;
      closest.downVolume = (closest.downVolume ?? 0) + t.usdcSize;
      downPriceSum.set(closest.timestamp, (downPriceSum.get(closest.timestamp) ?? 0) + t.price * t.usdcSize);
    }
  }

  // Compute volume-weighted average prices
  for (const d of mergedData) {
    if (d.upVolume && d.upVolume > 0) {
      d.avgUpPrice = (upPriceSum.get(d.timestamp) ?? 0) / d.upVolume;
    }
    if (d.downVolume && d.downVolume > 0) {
      d.avgDownPrice = (downPriceSum.get(d.timestamp) ?? 0) / d.downVolume;
    }
  }

  // Compute running pair cost + net exposure from chronological trades
  const sortedTrades = [...market.trades].sort((a, b) => a.timestamp - b.timestamp);
  let upTotalUsdc = 0, upTotalShares = 0;
  let downTotalUsdc = 0, downTotalShares = 0;

  // Map: kline timestamp → { pairCost, netExposure, cumUp, cumDown }
  const tradeState = new Map<number, { pairCost?: number; netExposure: number; cumUp: number; cumDown: number }>();

  for (const t of sortedTrades) {
    const shares = t.price > 0 ? t.usdcSize / t.price : 0;
    if (t.side === 'Up') {
      upTotalUsdc += t.usdcSize;
      upTotalShares += shares;
    } else {
      downTotalUsdc += t.usdcSize;
      downTotalShares += shares;
    }

    let pairCost: number | undefined;
    if (upTotalShares > 0 && downTotalShares > 0) {
      pairCost = (upTotalUsdc / upTotalShares) + (downTotalUsdc / downTotalShares);
    }

    const closest = mergedData.reduce((prev, curr) =>
      Math.abs(curr.timestamp - t.timestamp) < Math.abs(prev.timestamp - t.timestamp) ? curr : prev
    );
    tradeState.set(closest.timestamp, {
      pairCost,
      netExposure: upTotalUsdc - downTotalUsdc,
      cumUp: upTotalUsdc,
      cumDown: downTotalUsdc,
    });
  }

  // Forward-fill pair cost, net exposure, cumulative values
  let lastState: { pairCost?: number; netExposure: number; cumUp: number; cumDown: number } | undefined;
  for (const d of mergedData) {
    if (tradeState.has(d.timestamp)) {
      lastState = tradeState.get(d.timestamp);
    }
    if (lastState != null) {
      d.pairCost = lastState.pairCost;
      d.netExposure = lastState.netExposure;
      d.cumUpUsdc = lastState.cumUp;
      d.cumDownUsdc = lastState.cumDown;
    }
  }

  // Y domains
  const prices = mergedData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pricePadding = (maxPrice - minPrice) * 0.1 || 0.5;

  const exposures = mergedData.filter((d) => d.netExposure != null).map((d) => d.netExposure!);
  const hasExposure = exposures.length > 0;
  const maxAbs = hasExposure ? Math.max(Math.abs(Math.min(...exposures)), Math.abs(Math.max(...exposures)), 1) : 1;
  const exposureDomain = maxAbs * 1.3; // symmetric around 0

  // Trade marker points
  const tradePoints = mergedData.filter((d) => d.hasTrade);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={mergedData} margin={{ top: 10, right: 60, bottom: 10, left: 10 }}>
        <defs>
          <linearGradient id="netExposureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.yes} stopOpacity={0.4} />
            <stop offset="50%" stopColor={COLORS.yes} stopOpacity={0} />
            <stop offset="50%" stopColor={COLORS.no} stopOpacity={0} />
            <stop offset="100%" stopColor={COLORS.no} stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 18%)" />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={[windowStart, windowEnd]}
          allowDataOverflow
          tickFormatter={(v) => formatElapsed(v - windowStart, market.windowDurationSec)}
          stroke="hsl(220 10% 40%)"
          fontSize={11}
        />
        <YAxis
          yAxisId="price"
          orientation="left"
          domain={[minPrice - pricePadding, maxPrice + pricePadding]}
          tickFormatter={(v) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          stroke="hsl(220 10% 40%)"
          fontSize={11}
          width={70}
        />
        <YAxis
          yAxisId="exposure"
          orientation="right"
          domain={[-exposureDomain, exposureDomain]}
          tickFormatter={(v) => {
            const abs = Math.abs(Number(v));
            if (abs >= 1000) return `$${(Number(v) / 1000).toFixed(0)}K`;
            return `$${Number(v).toFixed(0)}`;
          }}
          stroke="#64748b"
          fontSize={11}
          width={55}
          label={{ value: 'Net Exposure', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#64748b' }, offset: 10 }}
        />
        <Tooltip
          content={<CustomTooltip windowStart={windowStart} windowDurationSec={market.windowDurationSec} />}
        />
        <ReferenceLine yAxisId="exposure" y={0} stroke="#64748b" strokeDasharray="3 3" strokeOpacity={0.5} />
        {hasExposure && (
          <Area
            yAxisId="exposure"
            type="stepAfter"
            dataKey="netExposure"
            fill="url(#netExposureGrad)"
            stroke="none"
            connectNulls
          />
        )}
        {hasExposure && (
          <Line
            yAxisId="exposure"
            type="stepAfter"
            dataKey="netExposure"
            stroke="#38bdf8"
            dot={false}
            strokeWidth={1.5}
            connectNulls
            name="Net Exposure"
          />
        )}
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="price"
          stroke={COLORS.accentLight}
          dot={false}
          strokeWidth={2}
          name="코인 가격"
        />
        {tradePoints.map((tp, i) => {
          const side: 'Up' | 'Down' = (tp.upCount ?? 0) > 0 ? 'Up' : 'Down';
          return (
            <ReferenceDot
              key={i}
              yAxisId="price"
              x={tp.timestamp}
              y={tp.price}
              r={0}
              shape={<TradeMarker side={side} />}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function MarketTradeList({ market }: { market: PriceContextMarket }) {
  const windowStart = market.windowStartSec * 1000;
  const sorted = [...market.trades].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2">시간</th>
            <th className="text-left py-2">Side</th>
            <th className="text-right py-2">가격</th>
            <th className="text-right py-2">USDC</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 text-muted-foreground">
                +{formatElapsed(t.timestamp - windowStart, market.windowDurationSec)}
              </td>
              <td className={`py-2 font-medium ${t.side === 'Up' ? 'text-green-500' : 'text-red-500'}`}>
                {t.side}
              </td>
              <td className="text-right py-2">{t.price.toFixed(4)}</td>
              <td className="text-right py-2">{formatCurrency(t.usdcSize)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PriceContextPanel({ data }: PriceContextPanelProps) {
  const marketsWithKline = data.markets.filter((m) => m.klineData.length > 0);
  const [selectedId, setSelectedId] = useState<string>(
    marketsWithKline[0]?.conditionId ?? ''
  );

  const selectedMarket = data.markets.find((m) => m.conditionId === selectedId);

  if (data.totalUpDownMarkets === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          UpDown 마켓 데이터가 없습니다
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="총 UpDown 마켓"
          value={data.totalUpDownMarkets.toString()}
        />
        <StatCard
          label="분석 코인 수"
          value={data.coinSummaries.length.toString()}
        />
        <StatCard
          label="차트 데이터"
          value={`${marketsWithKline.length}개`}
          subValue={`최근 ${data.markets.length}개 중`}
        />
      </div>

      {/* Market selector + Detail chart */}
      {marketsWithKline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">마켓 가격 차트</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              마켓을 선택하면 코인 가격 + 거래 타이밍을 확인할 수 있습니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropdown selector */}
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full md:w-[500px]">
                <SelectValue placeholder="마켓 선택" />
              </SelectTrigger>
              <SelectContent>
                {marketsWithKline.map((m) => {
                  const d = new Date(m.windowStartSec * 1000);
                  const closed = isMarketClosed(m);
                  const { pnl } = computeMarketPnl(m);
                  const statusLabel = closed ? '완료' : '진행중';
                  const pnlStr = pnl !== null ? `${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)}` : '';
                  const label = `[${statusLabel}] ${m.coin} ${m.timeframe} — ${d.toLocaleString('ko-KR', {
                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}${pnlStr ? ` (${pnlStr})` : ''}`;
                  return (
                    <SelectItem key={m.conditionId} value={m.conditionId}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Large detail chart with PnL badge */}
            {selectedMarket && selectedMarket.klineData.length > 0 && (() => {
              const { pnl, totalCost, isHedged, isResolved } = computeMarketPnl(selectedMarket);
              const closed = isMarketClosed(selectedMarket);
              return (
                <div className="relative">
                  <div className="absolute top-2 right-16 z-10 flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${closed ? 'bg-muted text-muted-foreground' : 'bg-blue-500/20 text-blue-400'}`}>
                      {closed ? '완료' : '진행중'}
                    </span>
                    {!isHedged && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                        편향
                      </span>
                    )}
                    {pnl !== null && (
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded ${pnl >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                        {!isResolved && isHedged && <span className="text-xs opacity-70"> (확정)</span>}
                      </span>
                    )}
                    {totalCost > 0 && (
                      <span className="text-xs text-muted-foreground">
                        / 투입 {formatCurrency(totalCost)}
                      </span>
                    )}
                  </div>
                  <DetailPriceChart market={selectedMarket} />
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Selected market trade list */}
      {selectedMarket && selectedMarket.trades.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              선택 마켓 거래 ({selectedMarket.coin} {selectedMarket.timeframe})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MarketTradeList market={selectedMarket} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
