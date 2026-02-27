import type { Trade, RawClosedPosition, CategoryBreakdown } from '@/lib/types';

export function analyzeCategories(
  trades: Trade[],
  closedPositions: RawClosedPosition[]
): CategoryBreakdown[] {
  // Build PnL map by slug from closed positions
  const pnlBySlug = new Map<string, number>();
  for (const pos of closedPositions) {
    pnlBySlug.set(pos.slug, (pnlBySlug.get(pos.slug) ?? 0) + pos.realizedPnl);
  }

  // Build wins/losses by slug
  const winsBySlug = new Map<string, { wins: number; total: number }>();
  for (const pos of closedPositions) {
    const entry = winsBySlug.get(pos.slug) ?? { wins: 0, total: 0 };
    entry.total++;
    if (pos.realizedPnl > 0) entry.wins++;
    winsBySlug.set(pos.slug, entry);
  }

  // Group trades by slug (as proxy for category since we don't have category in trade data)
  const slugGroups = new Map<string, { count: number; sharesVolume: number; dollarVolume: number; title: string }>();
  for (const trade of trades) {
    const slug = trade.slug;
    const existing = slugGroups.get(slug) ?? { count: 0, sharesVolume: 0, dollarVolume: 0, title: trade.title };
    existing.count++;
    existing.sharesVolume += trade.size;
    existing.dollarVolume += trade.size * trade.price;
    slugGroups.set(slug, existing);
  }

  const totalTrades = trades.length;
  const categories: CategoryBreakdown[] = [];

  for (const [slug, data] of Array.from(slugGroups.entries())) {
    const winData = winsBySlug.get(slug);
    categories.push({
      category: data.title,
      tradeCount: data.count,
      sharesVolume: Math.round(data.sharesVolume * 100) / 100,
      dollarVolume: Math.round(data.dollarVolume * 100) / 100,
      pnl: Math.round((pnlBySlug.get(slug) ?? 0) * 100) / 100,
      winRate: winData && winData.total > 0 ? winData.wins / winData.total : 0,
      percentage: totalTrades > 0 ? data.count / totalTrades : 0,
    });
  }

  // Sort by volume descending
  categories.sort((a, b) => b.dollarVolume - a.dollarVolume);
  return categories;
}
