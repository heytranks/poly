import { notFound } from 'next/navigation';
import { resolveToWallet, getProfile, getAllTrades, getPositions, getClosedPositions, getPortfolioValue, getProfilePnl } from '@/lib/api/polymarket';
import { runFullAnalysis, transformTrades } from '@/lib/analyzers';
import { ProfileHeader } from '@/components/dashboard/profile-header';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';
import type { UserProfile, DataCoverage } from '@/lib/types';

interface PageProps {
  params: { username: string };
}

export default async function AnalyzePage({ params }: PageProps) {
  const input = decodeURIComponent(params.username);

  // 1. 입력값 → 지갑주소 변환 (0x... 직접 입력 or username → 스크래핑)
  const wallet = await resolveToWallet(input);
  if (!wallet) {
    notFound();
  }

  // 2. 모든 데이터 병렬 fetch
  const [profileData, rawTrades, openPositions, closedPositions, portfolioValue, profilePnl] =
    await Promise.all([
      getProfile(wallet).catch(() => null),
      getAllTrades(wallet).catch(() => []),
      getPositions(wallet).catch(() => []),
      getClosedPositions(wallet).catch(() => []),
      getPortfolioValue(wallet).catch(() => 0),
      getProfilePnl(wallet).catch(() => null),
    ]);

  // 3. 분석 엔진 실행
  const analysis = runFullAnalysis(rawTrades, closedPositions, openPositions);
  const trades = transformTrades(rawTrades);

  // Polymarket 공식 PnL로 보정 (closed positions 페이지네이션 한계 때문)
  if (profilePnl !== null) {
    analysis.pnl.totalPnl = Math.round(profilePnl * 100) / 100;
    analysis.pnl.realizedPnl = Math.round((profilePnl - analysis.pnl.unrealizedPnl) * 100) / 100;
  }

  // 4. 데이터 커버리지 계산
  const tradeTimestamps = rawTrades.map((t) => t.timestamp);
  const closedTimestamps = closedPositions.map((p) => p.timestamp);

  const fmtMin = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const dataCoverage: DataCoverage = {
    tradeCount: rawTrades.length,
    closedPositionCount: closedPositions.length,
    oldestTradeDate: tradeTimestamps.length > 0 ? fmtMin(Math.min(...tradeTimestamps)) : null,
    newestTradeDate: tradeTimestamps.length > 0 ? fmtMin(Math.max(...tradeTimestamps)) : null,
    oldestClosedDate: closedTimestamps.length > 0 ? fmtMin(Math.min(...closedTimestamps)) : null,
    newestClosedDate: closedTimestamps.length > 0 ? fmtMin(Math.max(...closedTimestamps)) : null,
  };

  // 5. 프로필 구성 (volume = trades 합산)
  const totalDollarVolume = rawTrades.reduce((s, t) => s + t.size * t.price, 0);
  const totalSharesVolume = rawTrades.reduce((s, t) => s + t.size, 0);
  const uniqueMarkets = new Set(rawTrades.map((t) => t.conditionId)).size;

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
      <SummaryCards analysis={analysis} tradeCount={trades.length} />
      <DashboardTabs analysis={analysis} trades={trades} />
    </div>
  );
}
