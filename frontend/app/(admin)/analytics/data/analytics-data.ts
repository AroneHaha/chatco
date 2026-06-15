// app/(admin)/analytics/data/analytics-data.ts
//
// Admin Analytics data layer.
// All mock data removed. Data is fetched from the Laravel API via BFF.
// API responses are auto-transformed from snake_case to camelCase by lib/api.ts.
//
// DB tables referenced: demand_zones, transactions, fare_points,
//   remittances, gcash_payment_intents, routes

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ── Interfaces (camelCase, matching transformed API responses) ───────

export type HeatmapIntensity = 'Critical' | 'High' | 'Moderate' | 'Low';

export interface HeatmapZone {
  id: string;
  name: string;
  routeId: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  commuterCount: number | null;
  intensity: string | null;
  // Computed for display
  zone?: string;
  color?: string;
}

export interface PaymentMethodUsage {
  method: string;
  transactions: number;
  percentage: number;
  amount: string;
  color: string;
  icon: string;
}

export interface PickupPoint {
  name: string;
  count: number;
}

export interface AnalyticsRemittance {
  shiftId: string;
  conductorName: string;
  driverName: string;
  unitNumber: string;
  date: string;
  totalCashless: number;
  cashDeclared: number;
  cashTotal: number;
  gcashTotal: number;
  remittanceStatus: string;
  timeIn: string;
  timeOut: string | null;
}

export interface GCashTransactionDaily {
  day: string;
  transactions: number;
  revenue: string;
}

export interface GCashTransactionMonthly {
  month: string;
  transactions: number;
  revenue: string;
}

export interface AnalyticsData {
  heatmapZones: HeatmapZone[];
  paymentUsage: PaymentMethodUsage[];
  pickupPoints: PickupPoint[];
  remittanceData: AnalyticsRemittance[];
  gcashDaily: GCashTransactionDaily[];
  gcashMonthly: GCashTransactionMonthly[];
}

// ── API response shape ────────────────────────────────────────────────

interface AnalyticsApiResponse {
  heatmapZones: HeatmapZone[];
  paymentUsage: PaymentMethodUsage[];
  pickupPoints: PickupPoint[];
  remittanceData: AnalyticsRemittance[];
  gcashDaily: GCashTransactionDaily[];
  gcashMonthly: GCashTransactionMonthly[];
}

// ── Hook ──────────────────────────────────────────────────────────────

const EMPTY_DATA: AnalyticsData = {
  heatmapZones: [],
  paymentUsage: [],
  pickupPoints: [],
  remittanceData: [],
  gcashDaily: [],
  gcashMonthly: [],
};

export function useAnalyticsData() {
  const [data, setData] = useState<AnalyticsData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<AnalyticsApiResponse>('/api/admin/analytics');
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}