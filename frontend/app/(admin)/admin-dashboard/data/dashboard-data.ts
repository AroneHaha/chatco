// app/(admin)/admin-dashboard/data/dashboard-data.ts

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, MapPin, Banknote, Calculator, Receipt, Ticket, Bell,
  SlidersHorizontal, User2Icon, type LucideIcon,
} from "lucide-react";

/* ─── INTERFACES (keep — used by components) ─── */

export interface VehicleItem {
  unit: string;
  driver: string;
  status: "Active" | "Maintenance";
}

export interface LostFoundItem {
  item: string;
  status: "Under Review" | "Reported" | "Returned";
}

export interface UserItem {
  name: string;
  role: string;
  status: "Active" | "Inactive";
}

export interface StatItem {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  link: string;
}

export interface SettingsModule {
  title: string;
  desc: string;
  icon: LucideIcon;
  iconColor: string;
  gradient: string;
  href: string;
}

export interface PickupPoint {
  name: string;
  val: number;
}

export interface PaymentTendencies {
  gcash: number;
  cash: number;
}

export interface AlertItem {
  id: string;
  type: string;
  message: string;
  time: string;
}

export interface DashboardData {
  recentVehicles: VehicleItem[];
  recentLostFound: LostFoundItem[];
  recentUsers: UserItem[];
  quickStats: StatItem[];
  settingsModules: SettingsModule[];
  topPickupPoints: PickupPoint[];
  paymentTendencies: PaymentTendencies;
}

/* ─── Static settings modules (navigation links — not from API) ─── */

const SETTINGS_MODULES: SettingsModule[] = [
  { title: "Fare Matrix", desc: "Set base fares and distance rates.", icon: Calculator, iconColor: "text-[#62A0EA]", gradient: "linear-gradient(135deg, rgba(98, 160, 234, 0.2) 0%, rgba(98, 160, 234, 0.05) 100%)", href: "/settings/fare-matrix" },
  { title: "Financial Rules", desc: "Configure fare deductions and splits.", icon: Receipt, iconColor: "text-sky-400", gradient: "linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0.05) 100%)", href: "/settings/financial-rules" },
  { title: "Voucher Generator", desc: "Create promo codes and free ride passes.", icon: Ticket, iconColor: "text-violet-400", gradient: "linear-gradient(135deg, rgba(167, 139, 250, 0.2) 0%, rgba(167, 139, 250, 0.05) 100%)", href: "/settings/voucher-generator" },
  { title: "Safety Notifications", desc: "Manage alert triggers and templates.", icon: Bell, iconColor: "text-amber-400", gradient: "linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.05) 100%)", href: "/settings/safety-notifications" },
  { title: "App Configuration", desc: "General system preferences and UI.", icon: SlidersHorizontal, iconColor: "text-pink-400", gradient: "linear-gradient(135deg, rgba(244, 114, 182, 0.2) 0%, rgba(244, 114, 182, 0.05) 100%)", href: "/settings/app-configuration" },
];

/* ─── Helpers ─── */

function formatPeso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-PH").format(value);
}

/* ─── Data Hook (real API — no mock) ─── */

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch analytics + vehicles + users + lost-items in parallel.
      // The "Recent Users" card needs the actual /admin/users list (all
      // roles, sorted by created_at DESC) — NOT /admin/registrations,
      // which only returns PENDING commuters. We request per_page=3 so
      // the backend does the slicing (less data over the wire).
      //
      // Response shapes:
      //  - analytics:    { data: { totals, payment_split, ... } } (flat obj)
      //  - vehicles:     { data: { data: [...], current_page, ... } } (paginator)
      //  - users:        { data: { data: [...], current_page, ... } } (paginator)
      //  - lost-items:   { data: { data: [...], current_page, ... } } (paginator)
      const [analyticsRes, vehiclesRes, usersRes, lostItemsRes] = await Promise.all([
        fetch("/api/admin/analytics", { headers: { Accept: "application/json" } }),
        fetch("/api/admin/vehicles?per_page=3", { headers: { Accept: "application/json" } }),
        // users + lost-items are best-effort: if either fails (e.g. permission
        // edge case), we still render the rest of the dashboard instead of
        // throwing the whole thing into the error state.
        fetch("/api/admin/users?per_page=3", { headers: { Accept: "application/json" } }).catch(() => null),
        fetch("/api/admin/lost-items?per_page=3", { headers: { Accept: "application/json" } }).catch(() => null),
      ]);

      if (!analyticsRes.ok) throw new Error("Failed to load analytics");
      if (!vehiclesRes.ok) throw new Error("Failed to load vehicles");

      const analyticsJson = await analyticsRes.json();
      const vehiclesJson = await vehiclesRes.json();
      const usersJson = usersRes?.ok ? await usersRes.json() : { data: { data: [] } };
      const lostItemsJson = lostItemsRes?.ok ? await lostItemsRes.json() : { data: { data: [] } };

      const analytics = analyticsJson.data;

      // The proxy returns { data: <laravel_response> }.
      // Laravel paginator: { data: [...items], current_page, total, ... }
      // So the full shape is: { data: { data: [...items], current_page, ... } }
      // We need to extract the inner array. Use Array.isArray guards so the
      // hook also tolerates a bare-array response if the backend ever changes.
      const vehiclesRaw = vehiclesJson.data;
      const vehiclesData = Array.isArray(vehiclesRaw) ? vehiclesRaw :
                           Array.isArray(vehiclesRaw?.data) ? vehiclesRaw.data : [];

      const usersRaw = usersJson.data;
      const usersData = Array.isArray(usersRaw) ? usersRaw :
                        Array.isArray(usersRaw?.data) ? usersRaw.data : [];

      const lostItemsRaw = lostItemsJson.data;
      const lostItems = Array.isArray(lostItemsRaw) ? lostItemsRaw :
                        Array.isArray(lostItemsRaw?.data) ? lostItemsRaw.data : [];

      // ── Quick Stats from real analytics ──
      const totalFares = analytics?.totals?.total_fares ?? 0;
      const totalRides = analytics?.totals?.paid_count ?? 0;
      const activeVehicles = analytics?.fleet?.active_vehicles ?? 0;
      const pendingRemittance = analytics?.remittances?.total_collected
        ? analytics.remittances.total_collected - (analytics.remittances.total_remitted ?? 0)
        : 0;

      const quickStats: StatItem[] = [
        { label: "Total Revenue (30d)", value: formatPeso(totalFares), icon: TrendingUp, color: "text-sky-400 bg-[#62A0EA]/15", link: "/analytics" },
        { label: "Total Rides (30d)", value: formatNumber(totalRides), icon: MapPin, color: "text-[#62A0EA] bg-[#62A0EA]/15", link: "/analytics" },
        { label: "Active Vehicles", value: formatNumber(activeVehicles), icon: User2Icon, color: "text-violet-400 bg-violet-400/15", link: "/monitoring" },
        { label: "Pending Remittance", value: formatPeso(pendingRemittance), icon: Banknote, color: "text-amber-400 bg-amber-400/15", link: "/remittance" },
      ];

      // ── Payment Tendencies from real split ──
      const cashTotal = analytics?.payment_split?.cash?.total ?? 0;
      const gcashTotal = analytics?.payment_split?.gcash?.total ?? 0;
      const grandTotal = cashTotal + gcashTotal;
      const paymentTendencies: PaymentTendencies = {
        gcash: grandTotal > 0 ? Math.round((gcashTotal / grandTotal) * 100) : 0,
        cash: grandTotal > 0 ? Math.round((cashTotal / grandTotal) * 100) : 0,
      };

      // ── Recent Vehicles (map API → VehicleItem) ──
      const recentVehicles: VehicleItem[] = (vehiclesData as Record<string, unknown>[]).slice(0, 3).map(v => {
        const driver = v.driver as Record<string, unknown> | null;
        return {
          unit: String(v.plate_number ?? "—"),
          driver: driver ? `${driver.first_name ?? ''} ${driver.last_name ?? ''}`.trim() || '—' : 'Unassigned',
          status: v.status === 'MAINTENANCE' ? 'Maintenance' : 'Active',
        };
      });

      // ── Recent Users (from /admin/users — all roles, newest first) ──
      // The backend AdminService::present() returns: id, email, role, name,
      // account_status, commuter_type, contact_number, verified_at, created_at.
      // We surface the role as-is and map account_status to Active/Inactive.
      // For non-commuters (admin/conductor) account_status is null — treat
      // those as Active since they wouldn't be in the system otherwise.
      const roleLabel = (role: unknown): string => {
        switch (role) {
          case 'ADMIN': return 'Admin';
          case 'CONDUCTOR': return 'Conductor';
          case 'COMMUTER': return 'Commuter';
          default: return 'User';
        }
      };
      const recentUsers: UserItem[] = (usersData as Record<string, unknown>[]).slice(0, 3).map(u => ({
        name: String(u.name ?? u.email ?? 'Unknown'),
        role: roleLabel(u.role),
        status: u.account_status === 'SUSPENDED' ? 'Inactive' : 'Active',
      }));

      // ── Recent Lost & Found ──
      const recentLostFound: LostFoundItem[] = (lostItems as Record<string, unknown>[]).slice(0, 3).map(item => ({
        item: String(item.item_name ?? item.description ?? 'Unknown item'),
        status: item.status === 'RETURNED' || item.status === 'CLAIMED' ? 'Returned' :
                item.status === 'AVAILABLE' || item.status === 'REPORTED' ? 'Under Review' : 'Reported',
      }));

      // ── Top Pickup Points (from the analytics response) ──
      // The backend aggregates PAID transactions by pickup_name — this gives
      // us the top 10 most-used boarding points in the last 30 days.
      // The response is untyped JSON, so narrow the row shape before mapping
      // and coerce both fields — matching how recentUsers/recentLostFound above
      // defend against missing keys.
      const rawPickupPoints = (analytics?.pickup_points ?? []) as Array<{
        name?: unknown;
        count?: unknown;
      }>;
      const topPickupPoints: PickupPoint[] = rawPickupPoints.map((p) => ({
        name: String(p.name ?? 'Unknown'),
        val: Number(p.count) || 0,
      }));

      setData({
        recentVehicles,
        recentLostFound,
        recentUsers,
        quickStats,
        settingsModules: SETTINGS_MODULES,
        topPickupPoints,
        paymentTendencies,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
