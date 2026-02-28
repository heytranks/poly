import type { BinanceKline } from '@/lib/types';

const BINANCE_API = 'https://api.binance.com/api/v3';

/**
 * Fetch 5m klines from Binance for a symbol within a time range.
 * Max 1000 candles per request (~3.5 days).
 */
export async function getKlines(
  symbol: string,
  startTimeMs: number,
  endTimeMs: number
): Promise<BinanceKline[]> {
  const url = `${BINANCE_API}/klines?symbol=${symbol}&interval=5m&startTime=${startTimeMs}&endTime=${endTimeMs}&limit=1000`;

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

/**
 * Fetch klines for multiple coins, covering the full time range of the given timestamps.
 * Returns a Map of `{SYMBOL}_{openTimeMs}` → BinanceKline for O(1) lookup.
 */
export async function fetchKlinesForCoins(
  coinTimestamps: Map<string, number[]> // coin → [windowStartSec, ...]
): Promise<Map<string, BinanceKline>> {
  const result = new Map<string, BinanceKline>();

  const fetches = Array.from(coinTimestamps.entries()).map(async ([coin, timestamps]) => {
    if (timestamps.length === 0) return;

    const symbol = `${coin}USDT`;
    const minSec = Math.min(...timestamps);
    const maxSec = Math.max(...timestamps);

    // Pad by 5 minutes on each end
    const startMs = (minSec - 300) * 1000;
    const endMs = (maxSec + 300) * 1000;

    const klines = await getKlines(symbol, startMs, endMs);
    for (const k of klines) {
      result.set(`${symbol}_${k.openTime}`, k);
    }
  });

  await Promise.all(fetches);
  return result;
}
