import { StatCard } from '@/components/shared/stat-card';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { AnalysisSummary } from '@/lib/types';

interface SummaryCardsProps {
  analysis: AnalysisSummary;
}

export function SummaryCards({ analysis }: SummaryCardsProps) {
  const { pnl, winRate } = analysis;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        label="총 손익"
        value={formatCurrency(pnl.totalPnl)}
        subValue={`실현 손익: ${formatCurrency(pnl.realizedPnl)}`}
        trend={pnl.totalPnl >= 0 ? 'up' : 'down'}
      />
      <StatCard
        label="승률"
        value={formatPercent(winRate.winRate)}
        subValue={`${winRate.wins}승 / ${winRate.losses}패 (${winRate.totalClosed} 마켓)`}
        trend={winRate.winRate >= 0.5 ? 'up' : 'down'}
      />
      <StatCard
        label="마켓당 평균 투입"
        value={formatCurrency(pnl.avgPositionSize)}
        subValue={`기대값: ${formatCurrency(winRate.expectancy)}`}
      />
      <StatCard
        label="최대 수익 마켓"
        value={formatCurrency(pnl.maxSingleWin)}
        trend="up"
      />
      <StatCard
        label="최대 손실 마켓"
        value={formatCurrency(pnl.maxSingleLoss)}
        trend="down"
      />
    </div>
  );
}
