// contexts/rewards-context.tsx
//
// Shared commuter rewards state: the progress ring + voucher list on the
// rewards page AND the "voucher ready to redeem" half of the Rewards tab badge.
//
// Hoisted for the same reason as the announcements context — the layout badge
// and the rewards page need the same numbers, and two independent fetches
// would drift (redeeming a voucher on the page would leave the badge stale).
// See contexts/announcements-context.tsx.
//
//   GET /api/commuter/rewards → { totalRides, ridesNeeded, currentCycleRides,
//                                 vouchers[] }
//
// The backend owns the cycle logic: every `ridesNeeded` (10) completed cashless
// rides mints another voucher, so the cycle repeats indefinitely and a commuter
// can hold several AVAILABLE vouchers at once. The badge counts them rather
// than showing a boolean, so "2 rides worth of free rides waiting" is visible
// without opening the page.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/contexts/auth-context";
import type { RewardData } from "@/app/(commuter)/rewards/types";

/**
 * Longer than the announcement poll: ride totals only move when a fare is
 * recorded, so this is just there to surface a voucher minted mid-session
 * (e.g. the commuter pays by GCash while sitting on the dashboard).
 */
const POLL_INTERVAL_MS = 60_000;

interface RewardsContextValue {
  data: RewardData | null;
  isLoading: boolean;
  error: string | null;
  /** Vouchers the commuter can redeem right now — drives the tab badge. */
  availableVoucherCount: number;
  refetch: () => Promise<void>;
}

const RewardsContext = createContext<RewardsContextValue | null>(null);

export function RewardsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<RewardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/commuter/rewards", {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to load rewards (HTTP ${res.status})`);
      }

      const json = await res.json();
      const d = json.data;

      setData({
        totalRides: d.totalRides ?? 0,
        ridesNeeded: d.ridesNeeded ?? 10,
        currentCycleRides: d.currentCycleRides ?? 0,
        vouchers: (d.vouchers ?? []).map((v: Record<string, unknown>) => ({
          id: String(v.id ?? ""),
          code: String(v.code ?? ""),
          status: (v.status ?? "AVAILABLE") as RewardData["vouchers"][number]["status"],
          expiresAt: String(v.expiresAt ?? ""),
          rideOrigin: String(v.rideOrigin ?? "Reward"),
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rewards.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Only fetch once auth has resolved and the user is signed in — an anonymous
  // request would 401 on every poll.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setData(null);
      setIsLoading(false);
      return;
    }

    void refetch();
    const id = setInterval(() => void refetch(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authLoading, isAuthenticated, refetch]);

  const availableVoucherCount = useMemo(
    () => (data?.vouchers ?? []).filter((v) => v.status === "AVAILABLE").length,
    [data]
  );

  const value = useMemo(
    () => ({ data, isLoading, error, availableVoucherCount, refetch }),
    [data, isLoading, error, availableVoucherCount, refetch]
  );

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

/**
 * Read the shared rewards state. Must be called under <RewardsProvider>,
 * which the commuter layout mounts.
 */
export function useRewardsData(): RewardsContextValue {
  const ctx = useContext(RewardsContext);
  if (!ctx) {
    throw new Error("useRewardsData must be used within a RewardsProvider");
  }
  return ctx;
}
