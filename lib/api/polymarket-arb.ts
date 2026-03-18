import { apiFetch } from './client';

const CLOB_API_URL = 'https://clob.polymarket.com';

export interface PolyClobMarket {
  condition_id: string;
  question: string;
  market_slug: string;
  active: boolean;
  closed: boolean;
  tokens: {
    token_id: string;
    outcome: string;
    price: number;
    winner: boolean;
  }[];
}

export async function getClobMarket(conditionId: string): Promise<PolyClobMarket | null> {
  try {
    const url = `${CLOB_API_URL}/markets/${conditionId}`;
    return await apiFetch<PolyClobMarket>(url, { revalidate: 0 });
  } catch {
    return null;
  }
}

export function parseClobPrices(market: PolyClobMarket): { yes: number; no: number } {
  const yesToken = market.tokens.find(t => t.outcome === 'Yes');
  const noToken = market.tokens.find(t => t.outcome === 'No');
  return {
    yes: yesToken?.price ?? 0,
    no: noToken?.price ?? 0,
  };
}
