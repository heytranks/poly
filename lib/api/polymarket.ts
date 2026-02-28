import { GAMMA_API_URL, DATA_API_URL, PAGINATION } from '@/lib/constants';
import { apiFetch } from './client';
import type {
  RawTrade,
  RawActivity,
  RawPosition,
  RawClosedPosition,
  RawMarket,
  RawProfile,
  ActivityType,
} from '@/lib/types';

// ============================================================
// User Resolution
// ============================================================

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isEthAddress(input: string): boolean {
  return ETH_ADDRESS_RE.test(input);
}

/** username → wallet 주소 변환. polymarket.com 프로필 페이지에서 proxyWallet 추출 */
export async function resolveUsername(username: string): Promise<string | null> {
  try {
    const res = await fetch(`https://polymarket.com/@${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': 'PolyAnalyzer/1.0' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"proxyWallet":"(0x[a-fA-F0-9]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** 입력값(지갑주소 or username)을 지갑주소로 변환 */
export async function resolveToWallet(input: string): Promise<string | null> {
  if (isEthAddress(input)) return input;
  return resolveUsername(input);
}

// ============================================================
// Profile
// ============================================================

export async function getProfile(address: string): Promise<RawProfile> {
  const url = `${GAMMA_API_URL}/public-profile?address=${encodeURIComponent(address)}`;
  return apiFetch<RawProfile>(url);
}

// ============================================================
// Trades
// ============================================================

export async function getTrades(
  wallet: string,
  options: { limit?: number; offset?: number } = {}
): Promise<RawTrade[]> {
  const limit = options.limit ?? PAGINATION.tradesPerPage;
  const offset = options.offset ?? 0;
  const url = `${DATA_API_URL}/trades?user=${encodeURIComponent(wallet)}&limit=${limit}&offset=${offset}`;
  return apiFetch<RawTrade[]>(url);
}

export async function getAllTrades(wallet: string): Promise<RawTrade[]> {
  const allTrades: RawTrade[] = [];
  let offset = 0;
  const limit = PAGINATION.tradesPerPage;

  while (offset < PAGINATION.maxTrades) {
    try {
      const batch = await getTrades(wallet, { limit, offset });
      allTrades.push(...batch);

      if (batch.length < limit) break;
      offset += limit;
    } catch {
      // API enforces max offset (e.g. 3000) — return what we have so far
      break;
    }
  }

  return allTrades;
}

// ============================================================
// Activity
// ============================================================

export async function getActivity(
  wallet: string,
  options: { limit?: number; offset?: number } = {}
): Promise<RawActivity[]> {
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;
  const url = `${DATA_API_URL}/activity?user=${encodeURIComponent(wallet)}&limit=${limit}&offset=${offset}`;
  return apiFetch<RawActivity[]>(url);
}

export async function getAllActivity(
  wallet: string,
  options: { types?: ActivityType[] } = {}
): Promise<RawActivity[]> {
  const allActivities: RawActivity[] = [];
  const limit = 100;
  const maxOffset = 10000;
  let offset = 0;

  while (offset < maxOffset) {
    try {
      const batch = await getActivity(wallet, { limit, offset });
      if (batch.length === 0) break;

      // Filter by types if specified
      const filtered = options.types
        ? batch.filter((a) => options.types!.includes(a.type))
        : batch;
      allActivities.push(...filtered);

      if (batch.length < limit) break;
      offset += limit;
    } catch {
      // API enforces max offset — return what we have so far
      break;
    }
  }

  return allActivities;
}

// ============================================================
// Positions
// ============================================================

export async function getPositions(wallet: string): Promise<RawPosition[]> {
  return paginateAll<RawPosition>(
    `${DATA_API_URL}/positions?user=${encodeURIComponent(wallet)}`
  );
}

export async function getClosedPositions(wallet: string): Promise<RawClosedPosition[]> {
  return paginateAll<RawClosedPosition>(
    `${DATA_API_URL}/closed-positions?user=${encodeURIComponent(wallet)}&sortBy=timestamp&order=desc`
  );
}

async function paginateAll<T>(baseUrl: string, pageSize = 50, maxPages = 40): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    try {
      const sep = baseUrl.includes('?') ? '&' : '?';
      const url = `${baseUrl}${sep}limit=${pageSize}&offset=${page * pageSize}`;
      const batch = await apiFetch<T[]>(url);
      all.push(...batch);
      if (batch.length < pageSize) break;
    } catch {
      // API enforces max offset — return what we have so far
      break;
    }
  }
  return all;
}

// ============================================================
// Profile PnL (scraped from polymarket.com — the only accurate source)
// ============================================================

export interface PnlHistoryPoint {
  t: number;  // Unix timestamp (seconds)
  p: number;  // PnL value
}

export async function getProfilePnl(wallet: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://polymarket.com/profile/${encodeURIComponent(wallet)}`,
      { headers: { 'User-Agent': 'PolyAnalyzer/1.0' }, cache: 'no-store' as const }
    );
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"pnl":([-\d.]+)/);
    return match ? parseFloat(match[1]) : null;
  } catch {
    return null;
  }
}

export async function getProfilePnlHistory(wallet: string): Promise<PnlHistoryPoint[]> {
  try {
    const res = await fetch(
      `https://polymarket.com/profile/${encodeURIComponent(wallet)}`,
      { headers: { 'User-Agent': 'PolyAnalyzer/1.0' }, cache: 'no-store' as const }
    );
    if (!res.ok) return [];
    const html = await res.text();

    // Find PnL timeseries data: "data":[{"t":1732752000,"p":22053934},...]
    const match = html.match(/"data":\[\{"t":\d+,"p":[\d.-]+\}[^\]]*\]/g);
    if (!match) return [];

    // Find the array with the widest time range (= ALL period)
    let bestData: PnlHistoryPoint[] = [];
    let bestRange = 0;
    for (const m of match) {
      try {
        const jsonStr = m.replace('"data":', '');
        const data = JSON.parse(jsonStr) as PnlHistoryPoint[];
        if (data.length < 2) continue;
        const range = data[data.length - 1].t - data[0].t;
        if (range > bestRange) {
          bestRange = range;
          bestData = data;
        }
      } catch {
        continue;
      }
    }

    return bestData;
  } catch {
    return [];
  }
}

// ============================================================
// Portfolio Value
// ============================================================

export async function getPortfolioValue(wallet: string): Promise<number> {
  const url = `${DATA_API_URL}/value?user=${encodeURIComponent(wallet)}`;
  const data = await apiFetch<{ user: string; value: number }[]>(url);
  if (Array.isArray(data) && data.length > 0) return data[0].value ?? 0;
  return 0;
}

// ============================================================
// Markets
// ============================================================

export async function getMarket(conditionId: string): Promise<RawMarket> {
  const url = `${GAMMA_API_URL}/markets?conditionId=${encodeURIComponent(conditionId)}`;
  const data = await apiFetch<RawMarket[]>(url);
  if (!data.length) throw new Error(`Market not found: ${conditionId}`);
  return data[0];
}

/**
 * Batch fetch market outcomes by slugs.
 * Returns a Map of slug → winning outcome index (0 or 1), or -1 if not resolved.
 */
export async function getMarketOutcomes(slugs: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (slugs.length === 0) return result;

  // Build chunks of 20 slugs each (URL length limit)
  const chunkSize = 20;
  const chunks: string[][] = [];
  for (let i = 0; i < slugs.length; i += chunkSize) {
    chunks.push(slugs.slice(i, i + chunkSize));
  }

  // Fetch all chunks in parallel
  const responses = await Promise.allSettled(
    chunks.map((chunk) => {
      const params = chunk.map((s) => `slug=${encodeURIComponent(s)}`).join('&');
      const url = `${GAMMA_API_URL}/markets?${params}&limit=${chunkSize}`;
      return apiFetch<RawMarket[]>(url);
    })
  );

  for (const res of responses) {
    if (res.status !== 'fulfilled') continue;
    for (const m of res.value) {
      if (!m.outcomePrices || !m.slug) continue;
      try {
        const prices: string[] = typeof m.outcomePrices === 'string'
          ? JSON.parse(m.outcomePrices)
          : m.outcomePrices;
        const winnerIdx = prices.indexOf('1');
        result.set(m.slug, winnerIdx);
      } catch {
        result.set(m.slug, -1);
      }
    }
  }

  return result;
}
