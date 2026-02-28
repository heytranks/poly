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

export interface TimingCell {
  day: number;
  hour: number;
  count: number;
  avgPnl: number;
  totalVolume: number;
}

export interface TimingPattern {
  grid: TimingCell[];
  peakDay: number;
  peakHour: number;
  mostActiveDay: string;
  mostActiveHour: number;
}

export interface CategoryBreakdown {
  category: string;
  tradeCount: number;
  sharesVolume: number;
  dollarVolume: number;
  percentage: number;
}

export interface DirectionAnalysis {
  yesCount: number;
  noCount: number;
  yesVolume: number;
  noVolume: number;
  avgYesPrice: number;
  avgNoPrice: number;
  bias: 'YES' | 'NO' | 'NEUTRAL';
}

export interface EntryPriceBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  totalVolume: number;
}

// ============================================================
// Hedge Analysis Types
// ============================================================

export type HedgeTimingCategory = 'simultaneous' | 'quick' | 'gradual' | 'delayed';

export interface HedgeTimingResult {
  conditionId: string;
  title: string;
  slug: string;
  firstYesBuy: Date;
  firstNoBuy: Date;
  gapMinutes: number;
  category: HedgeTimingCategory;
  firstLeg: 'YES' | 'NO';
}

export interface HedgeTimingBucket {
  category: HedgeTimingCategory;
  label: string;
  count: number;
  percentage: number;
}

export interface HedgeTimingAnalysis {
  pairs: HedgeTimingResult[];
  distribution: HedgeTimingBucket[];
  avgGapMinutes: number;
  medianGapMinutes: number;
  totalPairsAnalyzed: number;
}

export interface HedgeEfficiencyResult {
  conditionId: string;
  title: string;
  slug: string;
  capitalInvested: number;
  lockedProfit: number;
  roi: number;
  pairCost: number;
  hedgedSize: number;
}

export interface PairCostBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  avgRoi: number;
}

export interface HedgeEfficiencyAnalysis {
  pairs: HedgeEfficiencyResult[];
  costDistribution: PairCostBucket[];
  avgPairCost: number;
  avgRoi: number;
  totalCapitalDeployed: number;
  totalLockedProfit: number;
  capitalEfficiency: number;
}

export interface MarketGroupStats {
  label: string;
  marketCount: number;
  totalPnl: number;
  avgPnlPerMarket: number;
  winCount: number;
  lossCount: number;
  winRate: number;
}

export interface MarketSelectionAnalysis {
  hedged: MarketGroupStats;
  singleDirection: MarketGroupStats;
}

// --- 레그별 진입가 분석 ---

export interface LegEntryPair {
  conditionId: string;
  title: string;
  slug: string;
  firstLeg: 'YES' | 'NO';
  firstLegAvgPrice: number;
  secondLegAvgPrice: number;
  firstLegSize: number;
  secondLegSize: number;
  pairCost: number;
  spread: number;          // |firstLegPrice - secondLegPrice|
}

export interface PriceBucketCount {
  range: string;
  min: number;
  max: number;
  firstLegCount: number;
  secondLegCount: number;
}

export interface LegEntryAnalysis {
  pairs: LegEntryPair[];
  avgFirstLegPrice: number;
  avgSecondLegPrice: number;
  avgSpread: number;
  firstLegPriceDist: PriceBucketCount[];
  cheapEntryRate: number;    // first leg < 0.50 비율
}

// --- 가격 스프레드 패턴 ---

export interface SpreadScatterPoint {
  conditionId: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  pairCost: number;
  hedgedSize: number;
  lockedProfit: number;
}

export interface SpreadPatternAnalysis {
  points: SpreadScatterPoint[];
  avgYesPrice: number;
  avgNoPrice: number;
  avgPairCost: number;
  profitablePairs: number;    // pairCost < 1
  unprofitablePairs: number;  // pairCost >= 1
  profitableRate: number;
}

// --- 시간-가격 연동 ---

export interface TimePricePair {
  conditionId: string;
  title: string;
  slug: string;
  firstLeg: 'YES' | 'NO';
  firstLegPrice: number;
  secondLegPrice: number;
  gapMinutes: number;
  pairCost: number;
  category: HedgeTimingCategory;
}

export interface TimePriceBucket {
  category: HedgeTimingCategory;
  label: string;
  count: number;
  avgPairCost: number;
  avgFirstLegPrice: number;
  avgSecondLegPrice: number;
  profitableRate: number;
}

export interface TimePriceAnalysis {
  pairs: TimePricePair[];
  buckets: TimePriceBucket[];
  correlation: number;  // gap vs pairCost 상관계수
}

export interface HedgeAnalysis {
  timing: HedgeTimingAnalysis;
  efficiency: HedgeEfficiencyAnalysis;
  marketSelection: MarketSelectionAnalysis;
  legEntry: LegEntryAnalysis;
  spreadPattern: SpreadPatternAnalysis;
  timePrice: TimePriceAnalysis;
}

// ============================================================
// Bot Analysis Types (UpDown 5m Markets)
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

export interface BotOverview {
  totalMarkets: number;
  upBets: number;
  downBets: number;
  avgEntryOdds: number;
  totalVolume: number;
}

export interface EntryOddsBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  totalVolume: number;
}

export interface CoinBreakdown {
  coin: string;
  count: number;
  totalVolume: number;
}

export interface BotAnalysis {
  overview: BotOverview;
  entryOdds: EntryOddsBucket[];
  coinBreakdown: CoinBreakdown[];
  markets: UpDownMarketMeta[];
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
  timing?: TimingPattern;
  categories?: CategoryBreakdown[];
  direction?: DirectionAnalysis;
  entryPrice?: EntryPriceBucket[];
  hedgeAnalysis?: HedgeAnalysis;
  botAnalysis?: BotAnalysis;
}
