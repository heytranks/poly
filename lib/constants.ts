export const GAMMA_API_URL = 'https://gamma-api.polymarket.com';
export const DATA_API_URL = 'https://data-api.polymarket.com';

export const RATE_LIMITS = {
  trades: { requests: 200, windowMs: 10_000 },
  activity: { requests: 1000, windowMs: 10_000 },
  positions: { requests: 150, windowMs: 10_000 },
  markets: { requests: 300, windowMs: 10_000 },
} as const;

export const PAGINATION = {
  tradesPerPage: 500,
  maxTrades: 2000,
  activityPerPage: 100,
  maxActivities: 3100,   // API hard limit: offset 3000 max
  tablePageSize: 20,
} as const;

export const COLORS = {
  profit: '#22c55e',
  loss: '#ef4444',
  accent: '#7c3aed',
  accentLight: '#a78bfa',
  chartArea: 'rgba(124, 58, 237, 0.2)',
  yes: '#22c55e',
  no: '#ef4444',
  neutral: '#94a3b8',
} as const;

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#1a1528',
    border: '1px solid #2e2545',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#e2e8f0',
  },
  labelStyle: { color: '#e2e8f0' },
  itemStyle: { color: '#e2e8f0' },
} as const;
