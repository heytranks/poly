import { PREDICTFUN_API_URL, PREDICTFUN_API_KEY, ARB_CONFIG } from '@/lib/constants';
import { apiFetch } from './client';
import type { PredictFunRawMarket, PredictFunMarketsResponse, PredictFunOrderbook } from '@/lib/types';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (PREDICTFUN_API_KEY) {
    headers['X-Api-Key'] = PREDICTFUN_API_KEY;
  }
  return headers;
}

export async function getOpenMarkets(): Promise<PredictFunRawMarket[]> {
  const allMarkets: PredictFunRawMarket[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < ARB_CONFIG.maxPredictPages; page++) {
    const params = new URLSearchParams({ status: 'OPEN' });
    if (cursor) params.set('cursor', cursor);

    const url = `${PREDICTFUN_API_URL}/v1/markets?${params.toString()}`;
    const resp = await apiFetch<PredictFunMarketsResponse>(url, {
      headers: getHeaders(),
      revalidate: 0,
    });

    if (!resp.success || !resp.data?.length) break;

    allMarkets.push(...resp.data);

    if (!resp.cursor) break;
    cursor = resp.cursor;
  }

  return allMarkets;
}

export async function getOpenMarketsWithPolyIds(): Promise<PredictFunRawMarket[]> {
  const markets = await getOpenMarkets();
  return markets.filter(
    (m) => m.polymarketConditionIds && m.polymarketConditionIds.length > 0
  );
}

export async function getOrderbook(marketId: number): Promise<PredictFunOrderbook> {
  const url = `${PREDICTFUN_API_URL}/v1/markets/${marketId}/orderbook`;
  // API returns { data: { bids, asks, ... } }
  const resp = await apiFetch<{ data: PredictFunOrderbook }>(url, {
    headers: getHeaders(),
    revalidate: 0,
  });
  return resp.data;
}

export function extractPricesFromOrderbook(ob: PredictFunOrderbook): { yes: number; no: number } {
  const bids = ob.bids ?? [];
  const asks = ob.asks ?? [];

  // To BUY YES: take the best ask (lowest sell price)
  // To BUY NO: equivalent to selling YES at best bid, so NO price = 1 - bestBid
  const bestBid = bids.length > 0 ? bids[0][0] : 0;
  const bestAsk = asks.length > 0 ? asks[0][0] : 1;

  return {
    yes: Math.max(0, Math.min(1, bestAsk)),
    no: Math.max(0, Math.min(1, 1 - bestBid)),
  };
}

export function extractPricesFromMarket(market: PredictFunRawMarket): { yes: number; no: number } | null {
  if (!market.outcomes || market.outcomes.length < 2) return null;

  // outcomes are ordered: index 0 = Yes (indexSet 1), index 1 = No (indexSet 2)
  // But PredictFun doesn't always include prices in the market object
  // We'll need the orderbook for actual prices
  return null;
}
