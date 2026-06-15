// app/(admin)/admin-dashboard/data/dashboard-data.ts
//
// Admin Dashboard data layer.
// All mock data removed. Data is fetched from the Laravel API via BFF.
// API responses are auto-transformed from snake_case to camelCase by lib/api.ts.
//
// DB tables referenced: vehicles, lost_items, users, commuter_profiles,
//   fare_points, transactions, routes

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ── Interfaces (camelCase, matching transformed API responses) ───────

export interface RecentVehicle {
  id: string;
  unitNumber: string;
  plateNumber: string;
  routeId: string | null;
  driverId: string | null;
  conductorId: string | null;
  status: string | null;
  speed: number | null;
  capacityStatus: string | null;
  latitude: number | null;
  longitude: number | null;
  lastLocationUpdate: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined/computed fields the API may include
  routeName?: string;
  driverName?: string | null;
  conductorName?: string | null;
}

export interface RecentLostFound {
  id: string;
  itemName: string;
  description: string | null;
  imageUrl: string | null;
  plateNumber: string | null;
  driverName: string | null;
  conductorName: string | null;
  vehicleId: string | null;
  estimatedTimeLost: string | null;
  category: string | null;
  reportedById: string;
  reportedByRole: string;
  reporterName: string | null;
  status: string;
  claimedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecentUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  // From joined commuter_profiles
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  username?: string | null;
  accountStatus?: string | null;
  commuterType?: string | null;
}

export interface QuickStat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface SettingsModule {
  id: string;
  label: string;
  href: string;
  icon: string;
}

export interface TopPickupPoint {
  name: string;
  count: number;
}

export interface PaymentTendency {
  method: string;
  percentage: number;
  transactions: number;
}

// ── Consolidated data shape ───────────────────────────────────────────

export interface DashboardData {
  recentVehicles: RecentVehicle[];
  recentLostFound: RecentLostFound[];
  recentUsers: RecentUser[];
  quickStats: QuickStat[];
  settingsModules: SettingsModule[];
  topPickupPoints: TopPickupPoint[];
  paymentTendencies: PaymentTendency[];
}

// ── API response shape ────────────────────────────────────────────────
// Backend returns these from GET /api/admin/dashboard

interface DashboardApiResponse {
  recentVehicles: RecentVehicle[];
  recentLostFound: RecentLostFound[];
  recentUsers: RecentUser[];
  quickStats: QuickStat[];
  topPickupPoints: TopPickupPoint[];
  paymentTendencies: PaymentTendency[];
}

// ── Static config (not mock data — these define navigation) ───────────

export const SETTINGS_MODULES: SettingsModule[] = [
  { id: 'faqs', label: 'FAQs', href: '/admin/settings?tab=faqs', icon: 'HelpCircle' },
  { id: 'routes', label: 'Routes', href: '/admin/settings?tab=routes', icon: 'Map' },
  { id: 'remittance', label: 'Remittance Options', href: '/admin/settings?tab=remittance', icon: 'Wallet' },
  { id: 'vouchers', label: 'Vouchers', href: '/admin/settings?tab=vouchers', icon: 'Ticket' },
  { id: 'notifications', label: 'Notifications', href: '/admin/settings?tab=notifications', icon: 'Bell' },
  { id: 'rules', label: 'Rules & Config', href: '/admin/settings?tab=rules', icon: 'Settings' },
  { id: 'safety', label: 'Safety', href: '/admin/settings?tab=safety', icon: 'Shield' },
  { id: 'account', label: 'Account', href: '/admin/settings?tab=account', icon: 'User' },
];

// ── Hook ──────────────────────────────────────────────────────────────

const EMPTY_DATA: DashboardData = {
  recentVehicles: [],
  recentLostFound: [],
  recentUsers: [],
  quickStats: [],
  settingsModules: SETTINGS_MODULES,
  topPickupPoints: [],
  paymentTendencies: [],
};

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<DashboardApiResponse>('/api/admin/dashboard');
      setData({
        ...result,
        settingsModules: SETTINGS_MODULES,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch, setData };
}