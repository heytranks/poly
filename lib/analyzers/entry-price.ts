import type { RawActivity, EntryPriceBucket } from '@/lib/types';

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

export function analyzeEntryPrice(activities: RawActivity[]): EntryPriceBucket[] {
  const buys = activities.filter((a) => a.type === 'TRADE' && a.side === 'BUY' && a.price > 0);

  return BUCKETS.map((bucket) => {
    const matching = buys.filter((a) => a.price >= bucket.min && a.price < bucket.max);
    const count = matching.length;
    const totalVolume = matching.reduce((s, a) => s + a.usdcSize, 0);

    return {
      range: bucket.range,
      min: bucket.min,
      max: bucket.max,
      count,
      totalVolume: Math.round(totalVolume * 100) / 100,
    };
  });
}
