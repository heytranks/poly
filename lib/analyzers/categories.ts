import type { RawActivity, CategoryBreakdown } from '@/lib/types';

export function analyzeCategories(activities: RawActivity[]): CategoryBreakdown[] {
  const trades = activities.filter((a) => a.type === 'TRADE');
  const totalTrades = trades.length;

  const slugGroups = new Map<string, { count: number; sharesVolume: number; dollarVolume: number; title: string }>();

  for (const trade of trades) {
    const slug = trade.slug;
    const existing = slugGroups.get(slug) ?? { count: 0, sharesVolume: 0, dollarVolume: 0, title: trade.title };
    existing.count++;
    existing.sharesVolume += trade.size;
    existing.dollarVolume += trade.usdcSize;
    slugGroups.set(slug, existing);
  }

  const categories: CategoryBreakdown[] = [];

  for (const [, data] of Array.from(slugGroups.entries())) {
    categories.push({
      category: data.title,
      tradeCount: data.count,
      sharesVolume: Math.round(data.sharesVolume * 100) / 100,
      dollarVolume: Math.round(data.dollarVolume * 100) / 100,
      percentage: totalTrades > 0 ? data.count / totalTrades : 0,
    });
  }

  categories.sort((a, b) => b.dollarVolume - a.dollarVolume);
  return categories;
}
