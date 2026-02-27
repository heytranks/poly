import type { Trade, TimingPattern, TimingCell } from '@/lib/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function analyzeTiming(trades: Trade[]): TimingPattern {
  // Initialize 7x24 grid
  const grid: TimingCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      grid.push({ day, hour, count: 0, avgPnl: 0, totalVolume: 0 });
    }
  }

  // Track PnL sums for averaging
  const pnlSums = new Map<string, { total: number; count: number }>();

  for (const trade of trades) {
    const d = trade.timestamp;
    const day = d.getUTCDay();
    const hour = d.getUTCHours();
    const key = `${day}-${hour}`;
    const idx = day * 24 + hour;

    grid[idx].count++;
    grid[idx].totalVolume += trade.size * trade.price;

    const tradePnl = trade.side === 'SELL' ? trade.size * trade.price - trade.cost : 0;
    const existing = pnlSums.get(key) ?? { total: 0, count: 0 };
    existing.total += tradePnl;
    existing.count++;
    pnlSums.set(key, existing);
  }

  // Calculate averages
  for (const cell of grid) {
    const key = `${cell.day}-${cell.hour}`;
    const entry = pnlSums.get(key);
    if (entry && entry.count > 0) {
      cell.avgPnl = Math.round((entry.total / entry.count) * 100) / 100;
    }
  }

  // Find peaks
  let peakCount = 0;
  let peakDay = 0;
  let peakHour = 0;
  for (const cell of grid) {
    if (cell.count > peakCount) {
      peakCount = cell.count;
      peakDay = cell.day;
      peakHour = cell.hour;
    }
  }

  // Most active day
  const dayCounts = Array.from({ length: 7 }, () => 0);
  for (const cell of grid) {
    dayCounts[cell.day] += cell.count;
  }
  const mostActiveDayIdx = dayCounts.indexOf(Math.max(...dayCounts));

  return {
    grid,
    peakDay,
    peakHour,
    mostActiveDay: DAY_NAMES[mostActiveDayIdx],
    mostActiveHour: peakHour,
  };
}
