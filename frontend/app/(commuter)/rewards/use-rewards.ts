// app/(commuter)/rewards/use-rewards.ts
//
// Page-level view-model for the rewards screen.
//
// The fetch itself now lives in contexts/rewards-context.tsx, because the
// commuter layout's tab badge needs the same voucher list — see that file for
// why. What stays here is everything only this page cares about: the
// activate-voucher modal and the progress-ring maths.
//
// The redeemVoucher function activates a voucher by showing its code
// to the conductor (who enters it in the FareCalcModal as a VOUCHER
// payment). The backend marks the voucher as USED when the conductor
// records the voucher fare — no separate "redeem" endpoint needed.

import { useState } from "react";
import { useRewardsData } from "@/contexts/rewards-context";

export function useRewards() {
  const { data, isLoading, error, refetch } = useRewardsData();
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<string | null>(null);

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
    refetch,
  };
}
