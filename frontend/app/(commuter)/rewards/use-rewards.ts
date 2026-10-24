// app/(commuter)/rewards/use-rewards.ts
//
// Page-level view-model for the rewards screen.
//
// The fetch itself now lives in contexts/rewards-context.tsx, because the
// commuter layout's tab badge needs the same voucher list — see that file for
// why. What stays here is the progress-ring maths only this page cares about.
//
// Vouchers aren't redeemed from this page: when the commuter scans the
// conductor's GCash QR, the scan modal offers an available voucher and
// redeems it via redeemVoucherForGcash() in lib/commuter/services/
// payment.service.ts (TransactionService::redeemVoucherForGcash on the backend).

import { useRewardsData } from "@/contexts/rewards-context";

export function useRewards() {
  const { data, isLoading, error, refetch } = useRewardsData();

  const progressPercent = data ? (data.currentCycleRides / data.ridesNeeded) * 100 : 0;
  const ridesRemaining = data ? data.ridesNeeded - data.currentCycleRides : 0;

  return {
    data,
    isLoading,
    error,
    progressPercent,
    ridesRemaining,
    refetch,
  };
}
