import type { RawActivity, BinanceKline } from '@/lib/types';
import type {
  PriceContextAnalysis,
  PriceContextMarket,
  PriceOverlayPoint,
  BotTradeMarker,
  CoinActivitySummary,
} from '@/lib/types';
import { parseUpDownSlug, coinToSymbol } from '@/lib/utils/updown-slug';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

interface UpDownTrade {
  coin: string;
  timeframe: string;
  windowDurationSec: number;
  windowStartSec: number;
  conditionId: string;
  slug: string;
  outcomeIndex: number;
  price: number;
  usdcSize: number;
  timestamp: number;
}

/**
 * Choose Binance kline interval based on window duration.
 * Shorter windows use finer granularity.
 */
function getKlineInterval(windowDurationSec: number): string {
  if (windowDurationSec <= 300) return '1s';      // 5m → 1s
  if (windowDurationSec <= 900) return '5s';      // 15m → 5s  (use 1s as Binance doesn't have 5s, fallback to 1m)
  if (windowDurationSec <= 3600) return '1m';     // 1h → 1m
  if (windowDurationSec <= 14400) return '5m';    // 4h → 5m
  return '15m';                                    // 1d → 15m
}

/**
 * Parse all UpDown BUY trades from activities (any timeframe).
 */
function parseUpDownTrades(activities: RawActivity[]): UpDownTrade[] {
  const trades: UpDownTrade[] = [];
  for (const a of activities) {
    if (a.type !== 'TRADE' || a.side !== 'BUY') continue;
    const parsed = parseUpDownSlug(a.slug);
    if (!parsed) continue;
    trades.push({
      coin: parsed.coin,
      timeframe: parsed.timeframe,
      windowDurationSec: parsed.windowDurationSec,
      windowStartSec: parsed.windowStartSec,
      conditionId: a.conditionId,
      slug: a.slug,
      outcomeIndex: a.outcomeIndex,
      price: a.price,
      usdcSize: a.usdcSize,
      timestamp: a.timestamp,
    });
  }
  return trades;
}

/**
 * Price Context Analysis: "When does the bot enter relative to actual coin price?"
 * Supports all UpDown timeframes. Overlays Binance kline data with bot trades.
 */
export async function analyzePriceContext(
  activities: RawActivity[]
): Promise<PriceContextAnalysis | undefined> {
  const updownTrades = parseUpDownTrades(activities);
  if (updownTrades.length === 0) return undefined;

  // Group trades by conditionId (each window is a separate market)
  const marketMap = new Map<string, UpDownTrade[]>();
  for (const t of updownTrades) {
    if (!marketMap.has(t.conditionId)) marketMap.set(t.conditionId, []);
    marketMap.get(t.conditionId)!.push(t);
  }

  // Get unique (coin, windowStartSec) combinations — most recent 20
  const marketEntries = Array.from(marketMap.entries())
    .map(([conditionId, trades]) => ({
      conditionId,
      trades,
      coin: trades[0].coin,
      timeframe: trades[0].timeframe,
      windowDurationSec: trades[0].windowDurationSec,
      windowStartSec: trades[0].windowStartSec,
      slug: trades[0].slug,
    }))
    .sort((a, b) => b.windowStartSec - a.windowStartSec)
    .slice(0, 20);

  // Fetch klines for each market with appropriate interval
  const markets: PriceContextMarket[] = [];
  const klineFetches = marketEntries.map(async (entry) => {
    const symbol = coinToSymbol(entry.coin);
    const startMs = entry.windowStartSec * 1000;
    const endMs = (entry.windowStartSec + entry.windowDurationSec) * 1000;
    const interval = getKlineInterval(entry.windowDurationSec);

    let klines: BinanceKline[] = [];
    try {
      klines = await getKlinesWithInterval(symbol, startMs, endMs, interval);
    } catch {
      // fallback: no kline data
    }

    const klineData: PriceOverlayPoint[] = klines.map((k) => ({
      timestamp: k.openTime,
      price: k.close,
    }));

    const tradeMarkers: BotTradeMarker[] = entry.trades.map((t) => ({
      timestamp: t.timestamp * 1000, // convert to ms
      side: t.outcomeIndex === 0 ? 'Up' as const : 'Down' as const,
      price: t.price,
      usdcSize: t.usdcSize,
      conditionId: t.conditionId,
    }));

    return {
      conditionId: entry.conditionId,
      slug: entry.slug,
      coin: entry.coin,
      timeframe: entry.timeframe,
      windowDurationSec: entry.windowDurationSec,
      windowStartSec: entry.windowStartSec,
      klineData,
      trades: tradeMarkers,
    };
  });

  const results = await Promise.all(klineFetches);
  markets.push(...results);

  // Coin activity summary
  const coinMap = new Map<string, { count: number; totalVolume: number; margins: number[] }>();
  for (const [, trades] of Array.from(marketMap.entries())) {
    const coin = trades[0].coin;
    const entry = coinMap.get(coin) ?? { count: 0, totalVolume: 0, margins: [] };
    entry.count++;
    const totalUsdc = trades.reduce((s, t) => s + t.usdcSize, 0);
    entry.totalVolume += totalUsdc;
    // Approximate margin from trades in this conditionId
    const yesTrades = trades.filter((t) => t.outcomeIndex === 0);
    const noTrades = trades.filter((t) => t.outcomeIndex === 1);
    if (yesTrades.length > 0 && noTrades.length > 0) {
      const yesVwap = yesTrades.reduce((s, t) => s + t.price * t.usdcSize, 0) / yesTrades.reduce((s, t) => s + t.usdcSize, 0);
      const noVwap = noTrades.reduce((s, t) => s + t.price * t.usdcSize, 0) / noTrades.reduce((s, t) => s + t.usdcSize, 0);
      entry.margins.push(1 - (yesVwap + noVwap));
    }
    coinMap.set(coin, entry);
  }

  const coinSummaries: CoinActivitySummary[] = Array.from(coinMap.entries())
    .map(([coin, data]) => ({
      coin,
      tradeCount: data.count,
      avgMargin: data.margins.length > 0 ? round4(data.margins.reduce((a, b) => a + b, 0) / data.margins.length) : 0,
      totalVolume: round2(data.totalVolume),
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  return {
    markets,
    coinSummaries,
    totalUpDownMarkets: marketMap.size,
  };
}

/**
 * Fetch klines with configurable interval from Binance.
 */
async function getKlinesWithInterval(
  symbol: string,
  startTimeMs: number,
  endTimeMs: number,
  interval: string
): Promise<BinanceKline[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTimeMs}&endTime=${endTimeMs}&limit=1000`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];

  const raw: unknown[][] = await res.json();
  return raw.map((k) => ({
    openTime: k[0] as number,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    closeTime: k[6] as number,
  }));
}
