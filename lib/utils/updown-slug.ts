/**
 * Parse UpDown 5m market slugs.
 * Format: `{coin}-updown-5m-{unixSeconds}`
 * Example: `btc-updown-5m-1772267700` → { coin: 'BTC', windowStartSec: 1772267700 }
 */

const UPDOWN_RE = /^([a-z]+)-updown-5m-(\d+)$/;

export interface UpDownSlugInfo {
  coin: string;           // uppercase: BTC, ETH, SOL, XRP
  windowStartSec: number; // Unix seconds
}

export function parseUpDownSlug(slug: string): UpDownSlugInfo | null {
  const m = slug.match(UPDOWN_RE);
  if (!m) return null;
  return {
    coin: m[1].toUpperCase(),
    windowStartSec: parseInt(m[2], 10),
  };
}

export function isUpDownSlug(slug: string): boolean {
  return UPDOWN_RE.test(slug);
}

/** Map coin symbol to Binance trading pair */
export function coinToSymbol(coin: string): string {
  return `${coin.toUpperCase()}USDT`;
}
