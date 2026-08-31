// app/(admin)/admin-dashboard/data/dashboard-data.ts

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, MapPin, Banknote, Calculator, Receipt, Ticket, Bell,
  SlidersHorizontal, User2Icon, Megaphone, History, type LucideIcon,
} from "lucide-react";
import type { AnalyticsData } from "@/lib/admin/services/analytics.service";

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

export interface AnnouncementItem {
  title: string;
  type: string;
  status: "Active" | "Archived";
}

export interface ActivityLogItem {
  description: string;
  category: string;
  by: string;
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
  /** Tonal icon-badge classes, e.g. "text-sky-400 bg-sky-400/15" — same
   * convention as StatItem.color on the quick-stats row above. */
  color: string;
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
  recentAnnouncements: AnnouncementItem[];
  recentActivityLogs: ActivityLogItem[];
  quickStats: StatItem[];
  settingsModules: SettingsModule[];
  topPickupPoints: PickupPoint[];
  paymentTendencies: PaymentTendencies;
}

/* ─── Static settings modules (navigation links — not from API) ─── */

const SETTINGS_MODULES: SettingsModule[] = [
  { title: "Fare Matrix", desc: "Set base fares and distance rates.", icon: Calculator, color: "text-[#62A0EA] bg-[#62A0EA]/15", href: "/settings/fare-matrix" },
  { title: "Financial Rules", desc: "Configure fare deductions and splits.", icon: Receipt, color: "text-sky-400 bg-sky-400/15", href: "/settings/financial-rules" },
  { title: "Voucher Generator", desc: "Create promo codes and free ride passes.", icon: Ticket, color: "text-violet-400 bg-violet-400/15", href: "/settings/voucher-generator" },
  { title: "Safety Notifications", desc: "Manage alert triggers and templates.", icon: Bell, color: "text-amber-400 bg-amber-400/15", href: "/settings/safety-notifications" },
  { title: "App Configuration", desc: "General system preferences and UI.", icon: SlidersHorizontal, color: "text-pink-400 bg-pink-400/15", href: "/settings/app-configuration" },
  { title: "Announcements", desc: "Publish and manage rider-facing notices.", icon: Megaphone, color: "text-indigo-400 bg-indigo-400/15", href: "/announcements" },
  { title: "Activity Logs", desc: "Audit trail of admin and system actions.", icon: History, color: "text-teal-400 bg-teal-400/15", href: "/activity-logs" },
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
      const [analyticsRes, vehiclesRes, usersRes, lostItemsRes, announcementsRes, activityLogsRes] = await Promise.all([
        fetch("/api/admin/analytics", { headers: { Accept: "application/json" } }),
        fetch("/api/admin/vehicles?per_page=3", { headers: { Accept: "application/json" } }),
        // users + lost-items + announcements + activity-logs are best-effort:
        // if any fails (e.g. permission edge case), we still render the rest
        // of the dashboard instead of throwing the whole thing into the
        // error state.
        fetch("/api/admin/users?per_page=3", { headers: { Accept: "application/json" } }).catch(() => null),
        fetch("/api/admin/lost-items?per_page=3", { headers: { Accept: "application/json" } }).catch(() => null),
        fetch("/api/admin/announcements?per_page=3", { headers: { Accept: "application/json" } }).catch(() => null),
        fetch("/api/admin/activity-logs?per_page=3", { headers: { Accept: "application/json" } }).catch(() => null),
      ]);

      if (!analyticsRes.ok) throw new Error("Failed to load analytics");
      if (!vehiclesRes.ok) throw new Error("Failed to load vehicles");

      const analyticsJson = await analyticsRes.json();
      const vehiclesJson = await vehiclesRes.json();
      const usersJson = usersRes?.ok ? await usersRes.json() : { data: { data: [] } };
      const lostItemsJson = lostItemsRes?.ok ? await lostItemsRes.json() : { data: { data: [] } };
      const announcementsJson = announcementsRes?.ok ? await announcementsRes.json() : { data: { data: [] } };
      const activityLogsJson = activityLogsRes?.ok ? await activityLogsRes.json() : { data: { data: [] } };

      const analytics: AnalyticsData | undefined = analyticsJson?.data;

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

      const announcementsRaw = announcementsJson.data;
      const announcementsData = Array.isArray(announcementsRaw) ? announcementsRaw :
                                Array.isArray(announcementsRaw?.data) ? announcementsRaw.data : [];

      const activityLogsRaw = activityLogsJson.data;
      const activityLogsData = Array.isArray(activityLogsRaw) ? activityLogsRaw :
                               Array.isArray(activityLogsRaw?.data) ? activityLogsRaw.data : [];

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

      // ── Recent Announcements ──
      const recentAnnouncements: AnnouncementItem[] = (announcementsData as Record<string, unknown>[]).slice(0, 3).map(a => ({
        title: String(a.title ?? 'Untitled'),
        type: String(a.type ?? 'General'),
        status: a.status === 'ARCHIVED' ? 'Archived' : 'Active',
      }));

      // ── Recent Activity Logs ──
      const recentActivityLogs: ActivityLogItem[] = (activityLogsData as Record<string, unknown>[]).slice(0, 3).map(l => ({
        description: String(l.description ?? '—'),
        category: String(l.category ?? 'GENERAL'),
        by: String(l.actor_name ?? 'System'),
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
        recentAnnouncements,
        recentActivityLogs,
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
