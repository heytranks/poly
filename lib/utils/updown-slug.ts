/**
 * Parse UpDown market slugs with multiple timeframes.
 * Format: `{coin}-updown-{timeframe}-{unixSeconds}`
 * Example: `btc-updown-5m-1772267700` → { coin: 'BTC', timeframe: '5m', windowDurationSec: 300, windowStartSec: 1772267700 }
 */

const UPDOWN_RE = /^([a-z]+)-updown-(\d+[mhd])-(\d+)$/;

const TIMEFRAME_TO_SEC: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

export interface UpDownSlugInfo {
  coin: string;              // uppercase: BTC, ETH, SOL, XRP
  timeframe: string;         // original: "5m", "15m", "1h", etc.
  windowDurationSec: number; // seconds: 300, 900, 3600, etc.
  windowStartSec: number;    // Unix seconds
}

export function parseUpDownSlug(slug: string): UpDownSlugInfo | null {
  const m = slug.match(UPDOWN_RE);
  if (!m) return null;
  const timeframe = m[2];
  const durationSec = TIMEFRAME_TO_SEC[timeframe];
  if (!durationSec) return null;
  return {
    coin: m[1].toUpperCase(),
    timeframe,
    windowDurationSec: durationSec,
    windowStartSec: parseInt(m[3], 10),
  };
}

export function isUpDownSlug(slug: string): boolean {
  return UPDOWN_RE.test(slug);
}

/** Map coin symbol to Binance trading pair */
export function coinToSymbol(coin: string): string {
  return `${coin.toUpperCase()}USDT`;
}
