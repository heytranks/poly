import { ARB_CONFIG } from '@/lib/constants';
import type { MarketPrices, ArbStrategy, ArbOpportunity, MatchedMarket } from '@/lib/types';

function calcStrategy(
  label: string,
  leg1Price: number,
  leg2Price: number,
  predictFeeBps: number
): ArbStrategy {
  const cost = leg1Price + leg2Price;
  const grossArb = 1 - cost;
  const fees = (predictFeeBps / 10_000) + ARB_CONFIG.polyFeePct;
  const netArb = grossArb - fees;
  const netArbPct = netArb * 100;

  return {
    label,
    cost,
    grossArb,
    fees,
    netArb,
    netArbPct,
    isProfitable: netArb > 0,
  };
}

export function calculateArbitrage(
  market: MatchedMarket,
  prices: MarketPrices
): ArbOpportunity {
  // Strategy A: Buy PredictFun YES + Buy Polymarket NO
  const strategyA = calcStrategy(
    'Predict YES + Poly NO',
    prices.predictYes,
    prices.polyNo,
    market.predictFeeBps
  );

  // Strategy B: Buy Polymarket YES + Buy PredictFun NO
  const strategyB = calcStrategy(
    'Poly YES + Predict NO',
    prices.polyYes,
    prices.predictNo,
    market.predictFeeBps
  );

  let bestStrategy: 'A' | 'B' | 'NONE' = 'NONE';
  let bestArbPct = 0;

  if (strategyA.netArbPct > strategyB.netArbPct && strategyA.isProfitable) {
    bestStrategy = 'A';
    bestArbPct = strategyA.netArbPct;
  } else if (strategyB.isProfitable) {
    bestStrategy = 'B';
    bestArbPct = strategyB.netArbPct;
  }

  const spread = Math.abs(prices.predictYes - prices.polyYes);

  return {
    matchedMarketId: market.id,
    predictMarketId: market.predictMarketId,
    polyConditionId: market.polyConditionId,
    title: market.predictTitle,
    category: market.category,
    polySlug: market.polySlug,
    prices,
    strategyA,
    strategyB,
    bestStrategy,
    bestArbPct,
    spread,
  };
}
