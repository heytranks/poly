'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ArbitrageDashboardData } from '@/lib/types';
import { ARB_CONFIG } from '@/lib/constants';

export function useArbitrageData() {
  const [data, setData] = useState<ArbitrageDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setCollecting(true);
    try {
      const res = await fetch('/api/arbitrage');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const dashboard: ArbitrageDashboardData = await res.json();
      setData(dashboard);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setCollecting(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, ARB_CONFIG.dashboardPollMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const refresh = useCallback(() => {
    setLoading(true);
    return fetchData();
  }, [fetchData]);

  return { data, loading, error, collecting, refresh };
}
