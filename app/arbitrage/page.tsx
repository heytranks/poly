import { ArbitrageDashboard } from '@/components/arbitrage/arbitrage-dashboard';

export const metadata = {
  title: 'Arbitrage Monitor - PolyAnalyzer',
  description: 'Cross-market arbitrage monitoring between PredictFun and Polymarket',
};

export default function ArbitragePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <ArbitrageDashboard />
    </div>
  );
}
