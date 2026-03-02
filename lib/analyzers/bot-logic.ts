import type {
  PriceContextMarket,
  TradeContext,
  LogicHistogramBucket,
  FirstLegEntry,
  MarketLogicSummary,
  BotLogicInsight,
  BotLogicAnalysis,
} from '@/lib/types';

/** Find nearest kline price for a given timestamp */
function nearestKlinePrice(klines: { timestamp: number; price: number }[], ts: number): number {
  let best = klines[0];
  let bestDist = Math.abs(klines[0].timestamp - ts);
  for (let i = 1; i < klines.length; i++) {
    const dist = Math.abs(klines[i].timestamp - ts);
    if (dist < bestDist) {
      best = klines[i];
      bestDist = dist;
    }
  }
  return best.price;
}

/** Pearson correlation coefficient */
function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
    sumY2 += ys[i] * ys[i];
  }
  const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/** Median of values */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Build per-market summary with coinChange, pairCost, up/down counts */
function buildMarketSummaries(markets: PriceContextMarket[]): MarketLogicSummary[] {
  const summaries: MarketLogicSummary[] = [];
  for (const m of markets) {
    if (m.klineData.length < 2 || m.trades.length === 0) continue;
    const firstPrice = m.klineData[0].price;
    const lastPrice = m.klineData[m.klineData.length - 1].price;
    const coinChangePct = firstPrice !== 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    const ups = m.trades.filter((t) => t.side === 'Up');
    const downs = m.trades.filter((t) => t.side === 'Down');

    let pairCost: number | null = null;
    if (ups.length > 0 && downs.length > 0) {
      const upVwap = ups.reduce((s, t) => s + t.price * t.usdcSize, 0) / ups.reduce((s, t) => s + t.usdcSize, 0);
      const downVwap = downs.reduce((s, t) => s + t.price * t.usdcSize, 0) / downs.reduce((s, t) => s + t.usdcSize, 0);
      pairCost = upVwap + downVwap;
    }

    const total = ups.length + downs.length;
    summaries.push({
      coin: m.coin,
      timeframe: m.timeframe,
      coinChangePct,
      pairCost,
      upCount: ups.length,
      downCount: downs.length,
      downRatio: total > 0 ? downs.length / total : 0,
    });
  }
  return summaries;
}

/** Generate rule-based insights from analysis data */
function generateInsights(
  analysis: Omit<BotLogicAnalysis, 'insights'>,
): BotLogicInsight[] {
  const insights: BotLogicInsight[] = [];
  const {
    directionLabel, momentumCorrelation, upWhenRising, downWhenFalling,
    medianTriggerPct, medianElapsedPct, upFirstRate, firstLegFollowsPrice,
    firstLegEntries, marketSummaries, avgPairCost, priceVsCostCorrelation,
    totalTradesAnalyzed,
  } = analysis;

  // 1. Direction strategy
  if (directionLabel === '모멘텀') {
    insights.push({
      title: '추세 추종 전략',
      description: `가격 상승 시 Up, 하락 시 Down을 매수하는 모멘텀 전략 (상관 ${momentumCorrelation.toFixed(2)}). 가격↑시 Up 매수 비율 ${(upWhenRising * 100).toFixed(0)}%.`,
      type: 'neutral',
    });
  } else if (directionLabel === '역추세') {
    insights.push({
      title: '역추세 전략',
      description: `가격 방향 반대로 베팅하는 역추세 전략 (상관 ${momentumCorrelation.toFixed(2)}). 가격↑시 Down 매수 ${((1 - upWhenRising) * 100).toFixed(0)}%, 가격↓시 Up 매수 ${((1 - downWhenFalling) * 100).toFixed(0)}%.`,
      type: 'neutral',
    });
  } else {
    // 혼합 — check if it's conditionally contrarian
    const hedgedMarkets = marketSummaries.filter((m) => m.pairCost !== null);
    const risingMarkets = hedgedMarkets.filter((m) => m.coinChangePct > 0.1);
    const risingDownHeavy = risingMarkets.filter((m) => m.downRatio > 0.55);
    if (risingMarkets.length >= 2 && risingDownHeavy.length / risingMarkets.length > 0.5) {
      insights.push({
        title: '조건부 역추세 전략',
        description: `전체적으로 혼합이지만, 가격 상승이 확인된 마켓에서 Down을 집중 매수 (상승 마켓 ${risingMarkets.length}개 중 ${risingDownHeavy.length}개에서 Down 우세). 방향이 확정된 후 반대편을 싸게 사는 패턴.`,
        type: 'positive',
      });
    } else {
      insights.push({
        title: '혼합 전략',
        description: `뚜렷한 방향 편향 없이 상황에 따라 Up/Down을 선택 (상관 ${momentumCorrelation.toFixed(2)}).`,
        type: 'neutral',
      });
    }
  }

  // 2. Entry timing
  if (medianElapsedPct < 0.1) {
    insights.push({
      title: '초반 즉시 진입',
      description: `윈도우 시작 ${(medianElapsedPct * 100).toFixed(0)}% 시점에 첫 거래 (5분 윈도우 기준 ~${Math.round(medianElapsedPct * 300)}초). 윈도우 열리자마자 포지션을 잡는 고속 봇.`,
      type: 'neutral',
    });
  } else if (medianElapsedPct < 0.3) {
    insights.push({
      title: '초중반 진입',
      description: `윈도우 ${(medianElapsedPct * 100).toFixed(0)}% 시점에 진입. 약간의 가격 확인 후 매수.`,
      type: 'neutral',
    });
  } else {
    insights.push({
      title: '관망 후 진입',
      description: `윈도우 ${(medianElapsedPct * 100).toFixed(0)}% 시점까지 대기 후 진입. 충분한 가격 정보를 확보한 뒤 베팅.`,
      type: 'neutral',
    });
  }

  // 3. First leg pattern
  if (firstLegEntries.length >= 3) {
    if (upFirstRate > 0.8) {
      insights.push({
        title: '항상 Up 먼저 매수',
        description: `헷지 마켓의 ${(upFirstRate * 100).toFixed(0)}%에서 Up을 먼저 매수. 기본 포지션으로 Up을 잡은 뒤 가격 확인 후 Down 추가.`,
        type: 'neutral',
      });
    } else if (upFirstRate < 0.2) {
      insights.push({
        title: '항상 Down 먼저 매수',
        description: `헷지 마켓의 ${((1 - upFirstRate) * 100).toFixed(0)}%에서 Down을 먼저 매수. 기본 포지션으로 Down을 잡은 뒤 가격 확인 후 Up 추가.`,
        type: 'neutral',
      });
    }

    if (firstLegFollowsPrice > 0.7) {
      insights.push({
        title: '첫 레그가 가격 추종',
        description: `첫 매수 방향이 ${(firstLegFollowsPrice * 100).toFixed(0)}% 확률로 가격 방향과 일치. 가격 오르면 Up 먼저, 내리면 Down 먼저.`,
        type: 'neutral',
      });
    } else if (firstLegFollowsPrice < 0.3) {
      insights.push({
        title: '첫 레그가 가격 역행',
        description: `첫 매수 방향이 ${((1 - firstLegFollowsPrice) * 100).toFixed(0)}% 확률로 가격 반대. 가격 오를 때 Down 먼저, 내릴 때 Up 먼저 → 역추세 진입.`,
        type: 'neutral',
      });
    }

    const medianGapMs = median(firstLegEntries.map((f) => f.gapMs));
    if (medianGapMs < 5000) {
      insights.push({
        title: '양쪽 동시 진입',
        description: `첫↔두번째 레그 간격 중앙값 ${(medianGapMs / 1000).toFixed(1)}초. 거의 동시에 Up/Down 양쪽을 매수.`,
        type: 'neutral',
      });
    } else if (medianGapMs > 30000) {
      insights.push({
        title: '시차 분할 진입',
        description: `첫↔두번째 레그 간격 중앙값 ${(medianGapMs / 1000).toFixed(0)}초. 첫 레그 후 가격 움직임을 확인한 뒤 두번째 레그 진입.`,
        type: 'neutral',
      });
    }
  }

  // 4. Trigger sensitivity
  if (medianTriggerPct < 0.05) {
    insights.push({
      title: '극소 변동 반응',
      description: `트리거 중앙값 ${medianTriggerPct.toFixed(3)}%. 0.05% 미만의 미세한 가격 변동에도 거래를 실행하는 고빈도 봇.`,
      type: 'neutral',
    });
  } else if (medianTriggerPct > 0.2) {
    insights.push({
      title: '큰 변동 후 진입',
      description: `트리거 중앙값 ${medianTriggerPct.toFixed(3)}%. 의미 있는 가격 움직임이 발생한 뒤에만 거래.`,
      type: 'neutral',
    });
  }

  // 5. Pair cost edge
  if (avgPairCost !== null) {
    if (avgPairCost < 0.95) {
      insights.push({
        title: `높은 확정 수익률 (Pair Cost ${avgPairCost.toFixed(4)})`,
        description: `평균 Pair Cost ${avgPairCost.toFixed(4)} → 마켓당 평균 ${((1 - avgPairCost) * 100).toFixed(1)}% 확정 수익. 방향 무관하게 수익이 보장되는 구조.`,
        type: 'positive',
      });
    } else if (avgPairCost < 1.0) {
      insights.push({
        title: `소폭 확정 수익 (Pair Cost ${avgPairCost.toFixed(4)})`,
        description: `평균 Pair Cost ${avgPairCost.toFixed(4)} → 마켓당 평균 ${((1 - avgPairCost) * 100).toFixed(1)}% 수익. 얇은 마진이지만 확정적.`,
        type: 'positive',
      });
    } else {
      insights.push({
        title: `Pair Cost 1.0 초과 (${avgPairCost.toFixed(4)})`,
        description: `평균 Pair Cost가 1을 넘어 헷지 기준으로는 손실 구조. 한쪽 방향 베팅 수익에 의존.`,
        type: 'negative',
      });
    }
  }

  // 6. Price movement → cost reduction pattern
  if (priceVsCostCorrelation < -0.4 && marketSummaries.filter((m) => m.pairCost !== null).length >= 3) {
    insights.push({
      title: '가격 확정 시 Pair Cost 절감',
      description: `코인 가격 변동폭이 클수록 Pair Cost가 낮아지는 패턴 (상관 ${priceVsCostCorrelation.toFixed(2)}). 방향이 확정된 마켓에서 반대편을 초저가에 매수하여 수익률을 극대화.`,
      type: 'positive',
    });
  }

  // 7. Trade frequency
  if (totalTradesAnalyzed > 200) {
    const avgPerMarket = totalTradesAnalyzed / analysis.totalMarketsAnalyzed;
    insights.push({
      title: `고빈도 거래 (마켓당 평균 ${Math.round(avgPerMarket)}건)`,
      description: `총 ${totalTradesAnalyzed}건을 ${analysis.totalMarketsAnalyzed}개 마켓에서 실행. 한 마켓 내에서 다수의 분할 매수를 수행.`,
      type: 'neutral',
    });
  }

  return insights;
}

export function analyzeBotLogic(markets: PriceContextMarket[]): BotLogicAnalysis | null {
  // Only analyze markets with kline data and trades
  const valid = markets.filter((m) => m.klineData.length >= 2 && m.trades.length > 0);
  if (valid.length < 3) return null;

  const allContexts: TradeContext[] = [];
  const firstLegs: FirstLegEntry[] = [];

  for (const market of valid) {
    const klines = market.klineData;
    const windowStartMs = market.windowStartSec * 1000;
    const windowDurationMs = market.windowDurationSec * 1000;
    const coinPriceAtOpen = klines[0].price;

    // Lookback window: 10% of duration, min 30s
    const lookbackMs = Math.max(market.windowDurationSec * 0.1 * 1000, 30_000);

    const sorted = [...market.trades].sort((a, b) => a.timestamp - b.timestamp);

    for (const trade of sorted) {
      const coinPriceAtTrade = nearestKlinePrice(klines, trade.timestamp);
      const pctChangeFromOpen = coinPriceAtOpen !== 0
        ? ((coinPriceAtTrade - coinPriceAtOpen) / coinPriceAtOpen) * 100
        : 0;

      // Recent change: price at (trade - lookback) vs trade
      const recentRefTs = trade.timestamp - lookbackMs;
      const coinPriceRecent = nearestKlinePrice(klines, recentRefTs);
      const pctChangeRecent = coinPriceRecent !== 0
        ? ((coinPriceAtTrade - coinPriceRecent) / coinPriceRecent) * 100
        : 0;

      const elapsedPct = windowDurationMs > 0
        ? Math.max(0, Math.min(1, (trade.timestamp - windowStartMs) / windowDurationMs))
        : 0;

      allContexts.push({
        side: trade.side,
        coinPriceAtTrade,
        coinPriceAtOpen,
        pctChangeFromOpen,
        pctChangeRecent,
        elapsedPct,
      });
    }

    // First leg analysis: which side traded first?
    if (sorted.length >= 2) {
      const sides = new Set(sorted.map((t) => t.side));
      if (sides.size === 2) {
        const first = sorted[0];
        const secondSide = first.side === 'Up' ? 'Down' : 'Up';
        const second = sorted.find((t) => t.side === secondSide);
        if (second) {
          const coinPriceAtFirst = nearestKlinePrice(klines, first.timestamp);
          const pctAtFirst = coinPriceAtOpen !== 0
            ? ((coinPriceAtFirst - coinPriceAtOpen) / coinPriceAtOpen) * 100
            : 0;
          firstLegs.push({
            firstSide: first.side,
            pctChangeAtFirst: pctAtFirst,
            gapMs: second.timestamp - first.timestamp,
          });
        }
      }
    }
  }

  if (allContexts.length < 5) return null;

  // B. Direction strategy — Pearson correlation
  const xs = allContexts.map((c) => c.pctChangeFromOpen);
  const ys = allContexts.map((c) => (c.side === 'Up' ? 1 : -1));
  const corr = pearson(xs, ys);
  const directionLabel: BotLogicAnalysis['directionLabel'] =
    corr > 0.3 ? '모멘텀' : corr < -0.3 ? '역추세' : '혼합';

  // Up when rising / Down when falling
  let upRisingCount = 0, upRisingTotal = 0;
  let downFallingCount = 0, downFallingTotal = 0;
  for (const c of allContexts) {
    if (c.pctChangeFromOpen > 0 && c.side === 'Up') { upRisingCount++; }
    if (c.pctChangeFromOpen > 0) { upRisingTotal++; }
    if (c.pctChangeFromOpen < 0 && c.side === 'Down') { downFallingCount++; }
    if (c.pctChangeFromOpen < 0) { downFallingTotal++; }
  }
  const upWhenRising = upRisingTotal > 0 ? upRisingCount / upRisingTotal : 0;
  const downWhenFalling = downFallingTotal > 0 ? downFallingCount / downFallingTotal : 0;

  // C. Trigger histogram — |pctChangeRecent| distribution
  const triggerBuckets: [string, number, number][] = [
    ['0-0.05%', 0, 0.05],
    ['0.05-0.1%', 0.05, 0.1],
    ['0.1-0.2%', 0.1, 0.2],
    ['0.2-0.5%', 0.2, 0.5],
    ['0.5-1%', 0.5, 1],
    ['1%+', 1, Infinity],
  ];
  const triggerHistogram: LogicHistogramBucket[] = triggerBuckets.map(([range, min, max]) => ({
    range, min, max, count: 0, upCount: 0, downCount: 0,
  }));
  const triggerValues: number[] = [];
  for (const c of allContexts) {
    const abs = Math.abs(c.pctChangeRecent);
    triggerValues.push(abs);
    for (const bucket of triggerHistogram) {
      if (abs >= bucket.min && abs < bucket.max) {
        bucket.count++;
        if (c.side === 'Up') bucket.upCount++;
        else bucket.downCount++;
        break;
      }
    }
  }
  const medianTriggerPct = median(triggerValues);

  // D. Timing histogram — first trade's elapsedPct per market
  const timingBuckets: [string, number, number][] = [
    ['0-10%', 0, 0.1],
    ['10-20%', 0.1, 0.2],
    ['20-30%', 0.2, 0.3],
    ['30-40%', 0.3, 0.4],
    ['40-50%', 0.4, 0.5],
    ['50-60%', 0.5, 0.6],
    ['60-70%', 0.6, 0.7],
    ['70-80%', 0.7, 0.8],
    ['80-90%', 0.8, 0.9],
    ['90-100%', 0.9, 1.01],
  ];
  const timingHistogram: LogicHistogramBucket[] = timingBuckets.map(([range, min, max]) => ({
    range, min, max, count: 0, upCount: 0, downCount: 0,
  }));

  // Per-market first trade elapsed
  const firstElapsedValues: number[] = [];
  for (const market of valid) {
    const klines = market.klineData;
    if (klines.length < 2 || market.trades.length === 0) continue;
    const windowStartMs = market.windowStartSec * 1000;
    const windowDurationMs = market.windowDurationSec * 1000;
    const firstTrade = [...market.trades].sort((a, b) => a.timestamp - b.timestamp)[0];
    const elapsed = windowDurationMs > 0
      ? Math.max(0, Math.min(1, (firstTrade.timestamp - windowStartMs) / windowDurationMs))
      : 0;
    firstElapsedValues.push(elapsed);
    for (const bucket of timingHistogram) {
      if (elapsed >= bucket.min && elapsed < bucket.max) {
        bucket.count++;
        if (firstTrade.side === 'Up') bucket.upCount++;
        else bucket.downCount++;
        break;
      }
    }
  }
  const medianElapsedPct = median(firstElapsedValues);

  // E. First leg analysis
  const upFirstRate = firstLegs.length > 0
    ? firstLegs.filter((f) => f.firstSide === 'Up').length / firstLegs.length
    : 0;
  const firstLegFollowsPrice = firstLegs.length > 0
    ? firstLegs.filter((f) =>
        (f.pctChangeAtFirst > 0 && f.firstSide === 'Up') ||
        (f.pctChangeAtFirst < 0 && f.firstSide === 'Down')
      ).length / firstLegs.length
    : 0;

  // F. Market summaries + price vs cost correlation
  const marketSummaries = buildMarketSummaries(valid);
  const hedgedMarkets = marketSummaries.filter((m) => m.pairCost !== null);
  const avgPairCost = hedgedMarkets.length > 0
    ? hedgedMarkets.reduce((s, m) => s + m.pairCost!, 0) / hedgedMarkets.length
    : null;

  let priceVsCostCorrelation = 0;
  if (hedgedMarkets.length >= 3) {
    priceVsCostCorrelation = pearson(
      hedgedMarkets.map((m) => Math.abs(m.coinChangePct)),
      hedgedMarkets.map((m) => m.pairCost!),
    );
  }

  const baseAnalysis = {
    tradeContexts: allContexts,
    directionLabel,
    momentumCorrelation: corr,
    upWhenRising,
    downWhenFalling,
    triggerHistogram,
    medianTriggerPct,
    timingHistogram,
    medianElapsedPct,
    firstLegEntries: firstLegs,
    upFirstRate,
    firstLegFollowsPrice,
    totalMarketsAnalyzed: valid.length,
    totalTradesAnalyzed: allContexts.length,
    marketSummaries,
    avgPairCost,
    priceVsCostCorrelation,
  };

  const insights = generateInsights(baseAnalysis);

  return { ...baseAnalysis, insights };
}
