// app/(admin)/admin-dashboard/data/dashboard-data.ts

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp, MapPin, Banknote, Calculator, Receipt, Ticket, Bell,
  SlidersHorizontal, User2Icon, Megaphone, History, type LucideIcon,
} from "lucide-react";
import type { AnalyticsData } from "@/lib/admin/services/analytics.service";
import { listForAdmin as listActivityLogs, type ActivityLog } from "@/lib/shared/services/activity-log.service";

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

export type ActivityLogItem = ActivityLog;

export interface DashboardActivityFeed {
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
}

export interface StatItem {
  label: string;
  value: string;
  icon: LucideIcon;
  link: string;
}

export interface SettingsModule {
  title: string;
  desc: string;
  icon: LucideIcon;
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
  { title: "Fare Matrix", desc: "Set base fares and distance rates.", icon: Calculator, href: "/settings/fare-matrix" },
  { title: "Financial Rules", desc: "Configure fare deductions and splits.", icon: Receipt, href: "/settings/financial-rules" },
  { title: "Voucher Generator", desc: "Create promo codes and free ride passes.", icon: Ticket, href: "/settings/voucher-generator" },
  { title: "Safety Notifications", desc: "Manage alert triggers and templates.", icon: Bell, href: "/settings/safety-notifications" },
  { title: "App Configuration", desc: "General system preferences and UI.", icon: SlidersHorizontal, href: "/settings/app-configuration" },
  { title: "Updates Center", desc: "View notifications and manage announcements.", icon: Megaphone, href: "/announcements" },
  { title: "Activity Logs", desc: "Audit trail of admin and system actions.", icon: History, href: "/activity-logs" },
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

const ACTIVITY_PREVIEW_LIMIT = 10;

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const activityPagingRef = useRef({ page: 0, hasMore: false });
  const activityRequestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const fetchData = useCallback(async () => {
    const generation = ++generationRef.current;
    activityRequestRef.current?.abort();
    const controller = new AbortController();
    activityRequestRef.current = controller;
    activityPagingRef.current = { page: 0, hasMore: false };
    setIsLoadingActivity(true);
    setActivityError(null);
    setHasMoreActivity(false);
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
      const [analyticsRes, vehiclesRes, usersRes, lostItemsRes, announcementsRes, activityPage] = await Promise.all([
        fetch("/api/admin/analytics?pickup_period=week", { headers: { Accept: "application/json" } }),
        fetch("/api/admin/vehicles?per_page=3", { headers: { Accept: "application/json" } }),
        // users + lost-items + announcements + activity-logs are best-effort:
        // if any fails (e.g. permission edge case), we still render the rest
        // of the dashboard instead of throwing the whole thing into the
        // error state.
        fetch("/api/admin/users?per_page=3", { headers: { Accept: "application/json" } }).catch(() => null),
        fetch("/api/admin/lost-items?per_page=3", { headers: { Accept: "application/json" } }).catch(() => null),
        fetch("/api/admin/announcements?per_page=3", { headers: { Accept: "application/json" } }).catch(() => null),
        listActivityLogs({ dateRange: "today", page: 1, perPage: ACTIVITY_PREVIEW_LIMIT, signal: controller.signal })
          .then((result) => ({ result, error: null }))
          .catch((error: unknown) => ({ result: null, error })),
      ]);

      if (generation !== generationRef.current) return;
      if (!analyticsRes.ok) throw new Error("Failed to load analytics");
      if (!vehiclesRes.ok) throw new Error("Failed to load vehicles");

      const analyticsJson = await analyticsRes.json();
      const vehiclesJson = await vehiclesRes.json();
      const usersJson = usersRes?.ok ? await usersRes.json() : { data: { data: [] } };
      const lostItemsJson = lostItemsRes?.ok ? await lostItemsRes.json() : { data: { data: [] } };
      const announcementsJson = announcementsRes?.ok ? await announcementsRes.json() : { data: { data: [] } };
      if (generation !== generationRef.current) return;
      const activityResult = activityPage.result;
      activityPagingRef.current = { page: activityResult?.page ?? 0, hasMore: !!activityResult && activityResult.page < activityResult.lastPage };
      setHasMoreActivity(activityPagingRef.current.hasMore);
      setActivityError(activityPage.error ? "Unable to load today's activity. Try again." : null);

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

      // ── Quick Stats from real analytics ──
      // The default analytics window ends today in the backend's timezone.
      // Reuse its daily series so these cards need no additional request.
      const today = analytics?.daily_series?.find(day => day.date === analytics.date_range?.to);
      const totalFares = (today?.cash ?? 0) + (today?.gcash ?? 0);
      const totalRides = today?.paid_count ?? 0;
      const activeVehicles = analytics?.fleet?.active_vehicles ?? 0;
      const pendingRemittance = analytics?.remittances?.total_collected
        ? analytics.remittances.total_collected - (analytics.remittances.total_remitted ?? 0)
        : 0;

      const quickStats: StatItem[] = [
        { label: "Total Revenue (Today)", value: formatPeso(totalFares), icon: TrendingUp, link: "/analytics" },
        { label: "Total Rides (Today)", value: formatNumber(totalRides), icon: MapPin, link: "/analytics" },
        { label: "Active Vehicles", value: formatNumber(activeVehicles), icon: User2Icon, link: "/monitoring" },
        { label: "Pending Remittance", value: formatPeso(pendingRemittance), icon: Banknote, link: "/remittance" },
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
      const recentActivityLogs = activityResult?.items ?? [];

      // ── Top Pickup Points (from the analytics response) ──
      // The backend counts this week's PAID cash/GCash rides by their major
      // fare point, combining that point's landmarks under one location.
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
      if (generation === generationRef.current) setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      if (generation === generationRef.current) {
        activityRequestRef.current = null;
        setIsLoadingActivity(false);
        setIsLoading(false);
      }
    }
  }, []);

  const loadMoreActivity = useCallback(async () => {
    const { page, hasMore } = activityPagingRef.current;
    // Page zero also allows retrying a failed first page, without reloading
    // the map, analytics and other dashboard previews.
    if (activityRequestRef.current || (!hasMore && page !== 0)) return;
    const generation = generationRef.current;
    const controller = new AbortController();
    activityRequestRef.current = controller;
    setIsLoadingActivity(true);
    setActivityError(null);
    try {
      const result = await listActivityLogs({ dateRange: "today", page: page + 1, perPage: ACTIVITY_PREVIEW_LIMIT, signal: controller.signal });
      if (generation !== generationRef.current) return;
      setData((previous) => {
        if (!previous) return previous;
        const seen = new Set(previous.recentActivityLogs.map((log) => log.id));
        const fresh = result.items.filter((log) => {
          if (seen.has(log.id)) return false;
          seen.add(log.id);
          return true;
        });
        return { ...previous, recentActivityLogs: [...previous.recentActivityLogs, ...fresh] };
      });
      activityPagingRef.current = { page: result.page, hasMore: result.items.length > 0 && result.page < result.lastPage };
      setHasMoreActivity(activityPagingRef.current.hasMore);
    } catch {
      if (generation === generationRef.current) setActivityError("Unable to load today's activity. Try again.");
    } finally {
      if (generation === generationRef.current) {
        activityRequestRef.current = null;
        setIsLoadingActivity(false);
      }
    }
  }, []);

  const cancelActivity = useCallback(() => {
    generationRef.current++;
    activityRequestRef.current?.abort();
    activityRequestRef.current = null;
  }, []);

  useEffect(() => {
    fetchData();
    return cancelActivity;
  }, [fetchData, cancelActivity]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    activityFeed: { isLoading: isLoadingActivity, hasMore: hasMoreActivity, error: activityError, loadMore: loadMoreActivity } satisfies DashboardActivityFeed,
  };
}
