import { notFound } from 'next/navigation';
import { resolveToWallet, getProfile, getAllActivity, getPositions, getClosedPositions, getPortfolioValue, getProfilePnl, getProfilePnlHistory } from '@/lib/api/polymarket';
import { runFullAnalysis } from '@/lib/analyzers';
import { analyzePriceContext } from '@/lib/analyzers/price-context';
import { analyzeClosedPositionStats } from '@/lib/analyzers/closed-position-stats';
import { getHedgePairs } from '@/lib/utils/hedge-pairs';
import { ProfileHeader } from '@/components/dashboard/profile-header';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { PnlChart } from '@/components/charts/pnl-chart';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';
import type { UserProfile, DataCoverage, RawActivity, RawClosedPosition, PnlDataPoint } from '@/lib/types';

interface PageProps {
  params: { username: string };
}

// Transform activities to trade-like format for dashboard display
function transformActivitiesToTrades(activities: RawActivity[]) {
  return activities
    .filter((a) => a.type === 'TRADE')
    .map((a) => ({
      id: a.transactionHash,
      side: a.side as 'BUY' | 'SELL',
      asset: `${a.conditionId}:${a.outcomeIndex}`,
      size: a.size,
      price: a.price,
      cost: a.usdcSize,
      conditionId: a.conditionId,
      timestamp: new Date(a.timestamp * 1000),
      transactionHash: a.transactionHash,
      title: a.title,
      slug: a.slug,
      icon: a.icon,
      outcome: a.outcome,
      outcomeIndex: a.outcomeIndex,
    }));
}

export default async function AnalyzePage({ params }: PageProps) {
  const input = decodeURIComponent(params.username);

  // 1. Resolve input to wallet address
  const wallet = await resolveToWallet(input);
  if (!wallet) {
    notFound();
  }

  // 2. Fetch all data in parallel
  const [profileData, activities, openPositions, closedPositions, portfolioValue, profilePnl, pnlHistory] =
    await Promise.all([
      getProfile(wallet).catch(() => null),
      getAllActivity(wallet, { types: ['TRADE', 'REDEEM', 'SPLIT', 'MERGE'] }).catch(() => []),
      getPositions(wallet).catch(() => []),
      getClosedPositions(wallet).catch(() => [] as RawClosedPosition[]),
      getPortfolioValue(wallet).catch(() => 0),
      getProfilePnl(wallet).catch(() => null),
      getProfilePnlHistory(wallet).catch(() => []),
    ]);

  // 3. Derive market outcomes from closed positions
  const marketOutcomes = new Map<string, number>();
  for (const cp of closedPositions) {
    if (!cp.slug || marketOutcomes.has(cp.slug)) continue;
    if (cp.curPrice === 1) {
      marketOutcomes.set(cp.slug, cp.outcomeIndex);
    } else if (cp.curPrice === 0) {
      marketOutcomes.set(cp.slug, cp.outcomeIndex === 0 ? 1 : 0);
    }
  }

  // 4. Run analysis engine with all activities (pattern analysis)
  const analysis = runFullAnalysis(activities, openPositions, marketOutcomes);

  // 5. Run price context analysis (async, requires Binance API calls)
  const priceContext = await analyzePriceContext(activities).catch(() => undefined);
  if (priceContext) {
    analysis.priceContext = priceContext;
  }

  // Build hedge pairs for trades table highlighting
  const hedgePairs = getHedgePairs(activities);

  // Transform all activities for dashboard display (trades tab shows full data)
  const trades = transformActivitiesToTrades(activities);

  // Override summary stats with closed positions (accurate, not truncated by activity API limit)
  const cpStats = analyzeClosedPositionStats(closedPositions);
  analysis.winRate = cpStats.winRate;
  analysis.pnl.maxSingleWin = cpStats.maxSingleWin;
  analysis.pnl.maxSingleLoss = cpStats.maxSingleLoss;
  analysis.pnl.avgPositionSize = cpStats.avgPositionSize;

  // Correct PnL with official Polymarket value (due to API limitations)
  if (profilePnl !== null) {
    analysis.pnl.totalPnl = Math.round(profilePnl * 100) / 100;
    analysis.pnl.realizedPnl = Math.round((profilePnl - analysis.pnl.unrealizedPnl) * 100) / 100;
  }

  // Use scraped PnL history for the chart (official Polymarket data)
  if (pnlHistory.length > 0) {
    // Convert {t, p} to PnlDataPoint format
    const scrapedSeries: PnlDataPoint[] = pnlHistory.map((point, idx, arr) => {
      const date = new Date(point.t * 1000).toISOString().split('T')[0];
      const prevPnl = idx > 0 ? arr[idx - 1].p : 0;
      return {
        date,
        cumulativePnl: Math.round(point.p * 100) / 100,
        tradePnl: Math.round((point.p - prevPnl) * 100) / 100,
      };
    });
    // Dedupe by date (keep last entry per day)
    const byDate = new Map<string, PnlDataPoint>();
    for (const pt of scrapedSeries) {
      byDate.set(pt.date, pt);
    }
    analysis.pnl.cumulativePnlSeries = Array.from(byDate.values());
  }

  // 6. Calculate data coverage
  const activityTimestamps = activities.map((a) => a.timestamp);

  const fmtMin = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const closedTimestamps = closedPositions.map((cp) => cp.timestamp).filter((t) => t > 0);

  const dataCoverage: DataCoverage = {
    activityCount: activities.length,
    closedPositionCount: cpStats.winRate.totalClosed,
    oldestActivityDate: activityTimestamps.length > 0 ? fmtMin(Math.min(...activityTimestamps)) : null,
    newestActivityDate: activityTimestamps.length > 0 ? fmtMin(Math.max(...activityTimestamps)) : null,
    oldestClosedDate: closedTimestamps.length > 0 ? fmtMin(Math.min(...closedTimestamps)) : null,
    newestClosedDate: closedTimestamps.length > 0 ? fmtMin(Math.max(...closedTimestamps)) : null,
  };

  // 7. Build profile
  const totalDollarVolume = activities
    .filter((a) => a.type === 'TRADE')
    .reduce((s, a) => s + a.usdcSize, 0);
  const totalSharesVolume = activities
    .filter((a) => a.type === 'TRADE')
    .reduce((s, a) => s + a.size, 0);
  const uniqueMarkets = new Set([
    ...openPositions.map((p) => p.conditionId),
    ...closedPositions.map((p) => p.conditionId),
  ]).size;

  const profile: UserProfile = {
    address: wallet,
    username: profileData?.name ?? input,
    pfp: profileData?.profileImage ?? '',
    bio: profileData?.bio ?? '',
    proTrader: profileData?.verifiedBadge ?? false,
    positions: openPositions.length,
    markets: uniqueMarkets,
    dollarVolume: totalDollarVolume,
    sharesVolume: totalSharesVolume,
    pnl: profilePnl ?? analysis.pnl.totalPnl,
    portfolioValue,
    dataCoverage,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <ProfileHeader profile={profile} />
      <SummaryCards analysis={analysis} />
      <PnlChart data={analysis.pnl.cumulativePnlSeries} />
      <DashboardTabs analysis={analysis} trades={trades} hedgePairs={hedgePairs} />
    </div>
  );
}
