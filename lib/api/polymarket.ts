import { GAMMA_API_URL, DATA_API_URL, PAGINATION } from '@/lib/constants';
import { apiFetch } from './client';
import type {
  RawTrade,
  RawActivity,
  RawPosition,
  RawClosedPosition,
  RawMarket,
  RawProfile,
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
  return apiFetch<RawProfile>(url, { revalidate: 60 });
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
  return apiFetch<RawTrade[]>(url, { revalidate: 30 });
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
  return apiFetch<RawActivity[]>(url, { revalidate: 30 });
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
      const batch = await apiFetch<T[]>(url, { revalidate: 30 });
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

export async function getProfilePnl(wallet: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://polymarket.com/profile/${encodeURIComponent(wallet)}`,
      { headers: { 'User-Agent': 'PolyAnalyzer/1.0' }, next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"pnl":([-\d.]+)/);
    return match ? parseFloat(match[1]) : null;
  } catch {
    return null;
  }
}

// ============================================================
// Portfolio Value
// ============================================================

export async function getPortfolioValue(wallet: string): Promise<number> {
  const url = `${DATA_API_URL}/value?user=${encodeURIComponent(wallet)}`;
  const data = await apiFetch<{ user: string; value: number }[]>(url, { revalidate: 30 });
  if (Array.isArray(data) && data.length > 0) return data[0].value ?? 0;
  return 0;
}

// ============================================================
// Markets
// ============================================================

export async function getMarket(conditionId: string): Promise<RawMarket> {
  const url = `${GAMMA_API_URL}/markets?conditionId=${encodeURIComponent(conditionId)}`;
  const data = await apiFetch<RawMarket[]>(url, { revalidate: 300 });
  if (!data.length) throw new Error(`Market not found: ${conditionId}`);
  return data[0];
}
