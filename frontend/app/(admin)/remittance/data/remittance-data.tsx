// app/(admin)/remittance/data/remittance-data.ts
//
// Admin Remittance data layer.
// All mock data removed. Data is fetched from the Laravel API via BFF.
// API responses are auto-transformed from snake_case to camelCase by lib/api.ts.
//
// DB tables referenced: remittances, shift_logs, conductor_profiles,
//   drivers, vehicles

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';
import type { RemittanceRecord, RemittanceStatus } from '@/types';

// Re-export canonical types for local consumers
export type { RemittanceStatus };
export type { RemittanceRecord };

// Admin table row shape — alias for RemittanceRecord
export type RemittanceRow = RemittanceRecord;

// ── API response shape ────────────────────────────────────────────────

interface RemittancesListResponse {
  remittances: RemittanceRecord[];
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useRemittanceData() {
  const [records, setRecords] = useState<RemittanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<RemittancesListResponse>('/api/admin/remittances');
      setRecords(result.remittances ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load remittances';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { records, isLoading, error, refresh };
}