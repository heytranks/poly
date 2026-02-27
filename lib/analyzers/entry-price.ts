import type { Trade, RawClosedPosition, EntryPriceBucket } from '@/lib/types';

const BUCKETS = [
  { range: '0-10c', min: 0, max: 0.1 },
  { range: '10-20c', min: 0.1, max: 0.2 },
  { range: '20-30c', min: 0.2, max: 0.3 },
  { range: '30-40c', min: 0.3, max: 0.4 },
  { range: '40-50c', min: 0.4, max: 0.5 },
  { range: '50-60c', min: 0.5, max: 0.6 },
  { range: '60-70c', min: 0.6, max: 0.7 },
  { range: '70-80c', min: 0.7, max: 0.8 },
  { range: '80-90c', min: 0.8, max: 0.9 },
  { range: '90-100c', min: 0.9, max: 1.01 },
];

export function analyzeEntryPrice(
  _trades: Trade[],
  closedPositions: RawClosedPosition[]
): EntryPriceBucket[] {
  return BUCKETS.map((bucket) => {
    const positions = closedPositions.filter(
      (p) => p.avgPrice >= bucket.min && p.avgPrice < bucket.max
    );

    const count = positions.length;
    const totalPnl = positions.reduce((s, p) => s + p.realizedPnl, 0);
    const avgPnl = count > 0 ? totalPnl / count : 0;
    const wins = positions.filter((p) => p.realizedPnl > 0).length;
    const winRate = count > 0 ? wins / count : 0;

    return {
      range: bucket.range,
      min: bucket.min,
      max: bucket.max,
      count,
      avgPnl: Math.round(avgPnl * 100) / 100,
      winRate,
    };
  });
}
