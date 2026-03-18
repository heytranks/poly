// ============================================================
// Raw API Response Types
// ============================================================

export type ActivityType = 'TRADE' | 'REDEEM' | 'SPLIT' | 'MERGE' | 'REWARD' | 'CONVERSION';

export interface RawTrade {
  side: 'BUY' | 'SELL';
  asset: string;
  size: number;
  price: number;
  conditionId: string;
  timestamp: number;          // Unix epoch (seconds)
  transactionHash: string;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
}

export interface RawActivity {
  type: ActivityType;
  side: 'BUY' | 'SELL' | '';
  size: number;
  usdcSize: number;           // USDC amount (cash flow)
  price: number;
  conditionId: string;
  timestamp: number;          // Unix epoch (seconds)
  transactionHash: string;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
}

export interface RawPosition {
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  outcomeIndex: number;
  eventSlug: string;
}

export interface RawClosedPosition {
  asset: string;
  conditionId: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  outcomeIndex: number;
  eventSlug: string;
  endDate: string;
  timestamp: number;
}

export interface RawMarket {
  id: string;
  conditionId: string;
  slug: string;
  title: string;
  description: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: number;
  active: boolean;
  closed: boolean;
  category: string;
  endDate: string;
  icon: string;
}

export interface RawProfile {
  createdAt: string;
  proxyWallet: string;
  displayUsernamePublic: boolean;
  pseudonym: string;
  name: string;
  profileImage?: string;
  bio?: string;
  users: { id: string; creator: boolean; mod: boolean }[];
  verifiedBadge: boolean;
}


// ============================================================
// Domain Types (enriched/transformed)
// ============================================================

export interface Trade {
  id: string;
  side: 'BUY' | 'SELL';
  asset: string;
  size: number;
  price: number;
  cost: number;
  conditionId: string;
  timestamp: Date;
  transactionHash: string;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  outcomeIndex: number;
}

export interface Position {
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
}

export interface ClosedPosition {
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  closePrice: number;
  initialValue: number;
  closeValue: number;
  cashPnl: number;
  percentPnl: number;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
}

// Position-level PnL calculated from activities
export interface PositionPnL {
  conditionId: string;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  outcomeIndex: number;
  totalBought: number;        // total USDC spent (BUY + SPLIT)
  totalSold: number;          // total USDC received (SELL + MERGE + REDEEM)
  realizedPnl: number;        // totalSold - totalBought
  avgBuyPrice: number;        // VWAP of buys
  isOpen: boolean;            // false if position fully closed
  firstActivityTime: Date;
  lastActivityTime: Date;
}

// Aggregate market PnL (summing all outcomes)
export interface MarketPnL {
  conditionId: string;
  title: string;
  slug: string;
  icon: string;
  realizedPnl: number;
  isOpen: boolean;
  positionCount: number;
  firstActivityTime: Date;
  lastActivityTime: Date;
}

export interface DataCoverage {
  activityCount: number;
  closedPositionCount: number;
  oldestActivityDate: string | null;
  newestActivityDate: string | null;
  oldestClosedDate: string | null;
  newestClosedDate: string | null;
}

export interface UserProfile {
  address: string;
  username: string;
  pfp: string;
  bio: string;
  proTrader: boolean;
  positions: number;
  markets: number;
  dollarVolume: number;
  sharesVolume: number;
  pnl: number;
  portfolioValue: number;
  dataCoverage?: DataCoverage;
}

// ============================================================
// Analysis Result Types
// ============================================================

export interface PnlDataPoint {
  date: string;
  cumulativePnl: number;
  tradePnl: number;
}

export interface PnlAnalysis {
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  cumulativePnlSeries: PnlDataPoint[];
  maxSingleWin: number;
  maxSingleLoss: number;
  profitFactor: number;
  avgPositionSize: number;   // average USDC invested per position
}

export interface WinRateAnalysis {
  totalClosed: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  longestWinStreak: number;
  longestLossStreak: number;
  expectancy: number;
}

export interface PairCostResult {
  conditionId: string;
  title: string;
  slug: string;
  avgYesPrice: number;
  avgNoPrice: number;
  pairCost: number;
  yesSize: number;
  noSize: number;
  hedgedSize: number;
  lockedProfit: number;
  isLocked: boolean;
}

export interface PairCostAnalysis {
  pairs: PairCostResult[];
  totalPairs: number;
  lockedPairs: number;
  totalLockedProfit: number;
  usageRate: number;
}

// ============================================================
// Strategy Profitability Analysis Types
// ============================================================

export interface PairCostHistogramBucket {
  range: string;
  min: number;
  max: number;
  count: number;
}

export interface StrategyProfitabilityAnalysis {
  histogram: PairCostHistogramBucket[];
  avgPairCost: number;            // average pair cost across ALL pairs
  profitableAvgMargin: number;    // avg (1 - pairCost) for profitable pairs
  unprofitableAvgOvercost: number; // avg (pairCost - 1) for unprofitable pairs
  profitableRate: number;
  totalPairs: number;
  profitablePairs: number;
  unprofitablePairs: number;
  totalLockedProfit: number;
  totalLoss: number;
  netResult: number;              // totalLockedProfit - totalLoss
}

// ============================================================
// Execution Analysis Types
// ============================================================

export type LegTimingCategory = 'same-tx' | '<10s' | '10-30s' | '30s-1m' | '1-5m' | '5m+';

export interface LegTimingBucket {
  category: LegTimingCategory;
  label: string;
  count: number;
  percentage: number;
}

export interface SizeBalancePoint {
  conditionId: string;
  title: string;
  yesShares: number;
  noShares: number;
  ratio: number; // min/max
}

export interface ExecutionTimelineEntry {
  conditionId: string;
  title: string;
  fills: {
    timestamp: number;
    side: 'YES' | 'NO';
    price: number;
    size: number;
    txHash: string;
  }[];
}

export interface ExecutionAnalysis {
  sameTxRate: number;           // same-tx YES+NO rate
  legTimingDistribution: LegTimingBucket[];
  avgFillsPerLeg: number;
  sizeBalance: SizeBalancePoint[];
  recentTimelines: ExecutionTimelineEntry[];
}

// ============================================================
// Market Selection Analysis Types (New)
// ============================================================

export type MarketCategory = string; // e.g. 'UpDown 5m', 'UpDown 15m', 'Crypto', 'Politics', 'Sports', 'Other'

export interface MarketCategoryStats {
  category: MarketCategory;
  marketCount: number;
  totalVolume: number;
  avgPairCost: number;
  profitableRate: number;
}

export interface UpDownCoinStats {
  coin: string;
  timeframe: string;
  marketCount: number;
  totalVolume: number;
  avgPairCost: number;
  profitableRate: number;
}

export interface NewMarketSelectionAnalysis {
  categoryStats: MarketCategoryStats[];
  updownCoinStats: UpDownCoinStats[];
  topMarkets: MarketVolumeEntry[];
  concurrentPositions: ConcurrentPositionPoint[];
  totalMarkets: number;
}

export interface MarketVolumeEntry {
  conditionId: string;
  title: string;
  capitalInvested: number;
  pairCost: number;
  isProfitable: boolean;
}

export interface ConcurrentPositionPoint {
  timestamp: number;
  date: string;
  openCount: number;
}

// ============================================================
// Position Sizing Analysis Types
// ============================================================

export interface SizingHistogramBucket {
  range: string;
  min: number;
  max: number;
  count: number;
}

export interface SizeVsCostPoint {
  conditionId: string;
  title: string;
  capitalInvested: number;
  pairCost: number;
}

export interface WeeklySizePoint {
  weekLabel: string;
  avgSize: number;
  count: number;
}

export interface PositionSizingAnalysis {
  histogram: SizingHistogramBucket[];
  mean: number;
  median: number;
  stdDev: number;
  cv: number;                 // coefficient of variation
  sizeVsCost: SizeVsCostPoint[];
  correlation: number;        // size vs pairCost correlation
  weeklyTrend: WeeklySizePoint[];
  roundNumberMode: number | null;
  roundNumberRate: number;
}

// ============================================================
// Profit Structure Analysis Types
// ============================================================

export interface ProfitHistogramBucket {
  range: string;
  min: number;
  max: number;
  count: number;
}

export interface MarginHistogramBucket {
  range: string;
  min: number;
  max: number;
  count: number;
}

export interface CumulativeEfficiencyPoint {
  timestamp: number;
  date: string;
  cumulativeProfit: number;
  cumulativeCapital: number;
  efficiency: number;
}

export interface CostBreakdownEntry {
  conditionId: string;
  title: string;
  avgYesPrice: number;
  avgNoPrice: number;
  pairCost: number;
  lockedProfit: number;
}

export interface ProfitStructureAnalysis {
  profitHistogram: ProfitHistogramBucket[];
  marginHistogram: MarginHistogramBucket[];
  cumulativeEfficiency: CumulativeEfficiencyPoint[];
  topPairsCostBreakdown: CostBreakdownEntry[];
  totalLockedProfit: number;
  avgMargin: number;
  capitalEfficiency: number;
  profitFactor: number;
}

// ============================================================
// Price Context Analysis Types (UpDown Markets)
// ============================================================

export interface PriceOverlayPoint {
  timestamp: number;
  price: number;            // coin price in USD
}

export interface BotTradeMarker {
  timestamp: number;
  side: 'Up' | 'Down';     // Up=YES(0), Down=NO(1)
  price: number;            // bot buy price (0~1)
  usdcSize: number;
  conditionId: string;
}

export interface PriceContextMarket {
  conditionId: string;
  slug: string;
  coin: string;
  timeframe: string;         // "5m", "15m", "1h", etc.
  windowDurationSec: number; // 300, 900, 3600, etc.
  windowStartSec: number;
  klineData: PriceOverlayPoint[];
  trades: BotTradeMarker[];
}

export interface CoinActivitySummary {
  coin: string;
  tradeCount: number;
  avgMargin: number;
  totalVolume: number;
}

export interface PriceContextAnalysis {
  markets: PriceContextMarket[];
  coinSummaries: CoinActivitySummary[];
  totalUpDownMarkets: number;
}

// ============================================================
// Bot Logic Analysis Types
// ============================================================

export interface TradeContext {
  side: 'Up' | 'Down';
  coinPriceAtTrade: number;
  coinPriceAtOpen: number;
  pctChangeFromOpen: number;
  pctChangeRecent: number;
  elapsedPct: number;
}

export interface LogicHistogramBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  upCount: number;
  downCount: number;
}

export interface FirstLegEntry {
  firstSide: 'Up' | 'Down';
  pctChangeAtFirst: number;
  gapMs: number;
}

export interface MarketLogicSummary {
  coin: string;
  timeframe: string;
  coinChangePct: number;
  pairCost: number | null;
  upCount: number;
  downCount: number;
  downRatio: number;
}

export interface BotLogicInsight {
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
}

export interface BotLogicAnalysis {
  tradeContexts: TradeContext[];
  directionLabel: '모멘텀' | '역추세' | '혼합';
  momentumCorrelation: number;
  upWhenRising: number;
  downWhenFalling: number;
  triggerHistogram: LogicHistogramBucket[];
  medianTriggerPct: number;
  timingHistogram: LogicHistogramBucket[];
  medianElapsedPct: number;
  firstLegEntries: FirstLegEntry[];
  upFirstRate: number;
  firstLegFollowsPrice: number;
  totalMarketsAnalyzed: number;
  totalTradesAnalyzed: number;
  marketSummaries: MarketLogicSummary[];
  avgPairCost: number | null;
  priceVsCostCorrelation: number;
  insights: BotLogicInsight[];
}

// ============================================================
// Bot Analysis Types (UpDown Markets) - Legacy kept for compatibility
// ============================================================

export interface UpDownMarketMeta {
  slug: string;
  coin: string;
  windowStartSec: number;
  outcomeIndex: number;       // 0=Up, 1=Down
  entryPrice: number;
  usdcSize: number;
  conditionId: string;
}

export interface BinanceKline {
  openTime: number;           // ms
  open: number;
  high: number;
  low: number;
  close: number;
  closeTime: number;          // ms
}

export interface AnalysisSummary {
  pnl: PnlAnalysis;
  winRate: WinRateAnalysis;
  pairCost: PairCostAnalysis;
  strategyProfitability?: StrategyProfitabilityAnalysis;
  execution?: ExecutionAnalysis;
  marketSelection?: NewMarketSelectionAnalysis;
  positionSizing?: PositionSizingAnalysis;
  profitStructure?: ProfitStructureAnalysis;
  priceContext?: PriceContextAnalysis;
}

// ============================================================
// Arbitrage Monitor Types
// ============================================================

// --- PredictFun Raw API types ---

export interface PredictFunOutcome {
  name: string;
  indexSet: number;
  onChainId: string;
  status: string | null;
}

export interface PredictFunRawMarket {
  id: number;
  title: string;
  question: string;
  conditionId: string;
  polymarketConditionIds: string[];
  categorySlug: string;
  status: string;
  tradingStatus: string;
  feeRateBps: number;
  outcomes: PredictFunOutcome[];
  imageUrl: string;
  isNegRisk: boolean;
  description: string;
}

export interface PredictFunMarketsResponse {
  success: boolean;
  cursor: string;
  data: PredictFunRawMarket[];
}

export interface PredictFunOrderbook {
  marketId: number;
  bids: [number, number][];  // [price, size]
  asks: [number, number][];
  lastOrderSettled: { price: string; side: string; outcome: string } | null;
  updateTimestampMs: number;
}

// --- Matched Market ---

export interface MatchedMarket {
  id: number;
  predictMarketId: number;
  predictTitle: string;
  polyConditionId: string;
  polySlug: string;
  polyQuestion: string;
  category: string;
  predictFeeBps: number;
  matchedAt: string;
}

// --- Price data ---

export interface MarketPrices {
  polyYes: number;
  polyNo: number;
  predictYes: number;
  predictNo: number;
  updatedAt: number;
}

// --- Arb Opportunity ---

export interface ArbStrategy {
  label: string;
  cost: number;
  grossArb: number;
  fees: number;
  netArb: number;
  netArbPct: number;
  isProfitable: boolean;
}

export interface ArbOpportunity {
  matchedMarketId: number;
  predictMarketId: number;
  polyConditionId: string;
  title: string;
  category: string;
  polySlug: string;
  prices: MarketPrices;
  strategyA: ArbStrategy;
  strategyB: ArbStrategy;
  bestStrategy: 'A' | 'B' | 'NONE';
  bestArbPct: number;
  spread: number;
}

// --- Arb Episode ---

export interface ArbEpisode {
  id: number;
  matchedMarketId: number;
  title: string;
  strategy: 'A' | 'B';
  thresholdPct: number;
  startedAt: string;
  peakArbPct: number;
  peakAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  status: 'OPEN' | 'CLOSED';
}

// --- API responses ---

export interface ArbitrageSummary {
  totalMatched: number;
  activeOpportunities: number;
  bestArbPct: number;
  openEpisodes: number;
  avgEpisodeDurationMin: number;
  totalEpisodes: number;
  lastCollectedAt: string | null;
}

export interface ArbitrageDashboardData {
  summary: ArbitrageSummary;
  opportunities: ArbOpportunity[];
  recentEpisodes: ArbEpisode[];
}
