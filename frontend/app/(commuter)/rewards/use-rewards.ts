// app/(commuter)/rewards/use-rewards.ts
//
// Real API-backed rewards hook. Fetches from GET /api/commuter/rewards
// which counts PAID rides, computes the reward cycle, auto-generates
// vouchers, and returns the full voucher list.
//
// The redeemVoucher function activates a voucher by showing its code
// to the conductor (who enters it in the FareCalcModal as a VOUCHER
// payment). The backend marks the voucher as USED when the conductor
// records the voucher fare — no separate "redeem" endpoint needed.

import { useState, useEffect, useCallback } from "react";
import { RewardData } from "./types";

export function useRewards() {
  const [data, setData] = useState<RewardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    setIsLoading(true);
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

  useEffect(() => {
    void fetchRewards();
  }, [fetchRewards]);

  // "Redeem" = activate the voucher by showing its code to the conductor.
  // The conductor enters the code in the FareCalcModal → the backend
  // validates + marks it USED + creates a PAID/VOUCHER transaction.
  // No separate API call is needed here — we just show the QR/code modal.
  const redeemVoucher = (voucherId: string) => {
    if (!data) return;
    const voucher = data.vouchers.find(v => v.id === voucherId);
    if (!voucher) return;
    setActiveVoucher(voucher.code);
    setShowVoucherModal(true);
  };

  const progressPercent = data ? (data.currentCycleRides / data.ridesNeeded) * 100 : 0;
  const ridesRemaining = data ? data.ridesNeeded - data.currentCycleRides : 0;

  return {
    data,
    isLoading,
    error,
    progressPercent,
    ridesRemaining,
    showVoucherModal,
    setShowVoucherModal,
    activeVoucher,
    redeemVoucher,
    refetch: fetchRewards,
  };
}
