import { StatCard } from '@/components/shared/stat-card';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { AnalysisSummary } from '@/lib/types';

interface SummaryCardsProps {
  analysis: AnalysisSummary;
  tradeCount: number;
}

export function SummaryCards({ analysis, tradeCount }: SummaryCardsProps) {
  const { pnl, winRate } = analysis;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        label="Total PnL"
        value={formatCurrency(pnl.totalPnl)}
        subValue={`Realized: ${formatCurrency(pnl.realizedPnl)}`}
        trend={pnl.totalPnl >= 0 ? 'up' : 'down'}
      />
      <StatCard
        label="Win Rate"
        value={formatPercent(winRate.winRate)}
        subValue={`${winRate.wins}W / ${winRate.losses}L`}
        trend={winRate.winRate >= 0.5 ? 'up' : 'down'}
      />
      <StatCard
        label="Trades"
        value={tradeCount.toLocaleString()}
        subValue={`${winRate.totalClosed} closed positions`}
      />
      <StatCard
        label="Avg Position"
        value={formatCurrency(winRate.totalClosed > 0 ? pnl.realizedPnl / winRate.totalClosed : 0)}
        subValue={`Expectancy: ${formatCurrency(winRate.expectancy)}`}
      />
      <StatCard
        label="Best Trade"
        value={formatCurrency(pnl.maxSingleWin)}
        trend="up"
      />
      <StatCard
        label="Worst Trade"
        value={formatCurrency(pnl.maxSingleLoss)}
        trend="down"
      />
    </div>
  );
}
