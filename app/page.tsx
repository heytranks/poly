import { BarChart3, TrendingUp, Shield, Zap } from 'lucide-react';
import { SearchBar } from '@/components/search/search-bar';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)]">
      <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <BarChart3 className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold">PolyAnalyzer</h1>
        </div>

        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
          Analyze any Polymarket trader&apos;s strategy, PnL, and edge detection in seconds.
        </p>

        <SearchBar />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16">
          <Feature
            icon={<TrendingUp className="h-5 w-5" />}
            title="PnL Analysis"
            description="Track realized & unrealized profits with cumulative charts"
          />
          <Feature
            icon={<Shield className="h-5 w-5" />}
            title="Pair Cost Detection"
            description="Detect hedged positions and locked profit strategies"
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Win Rate & Streaks"
            description="Win/loss ratios, streaks, and expectancy metrics"
          />
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/50">
      <div className="text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
