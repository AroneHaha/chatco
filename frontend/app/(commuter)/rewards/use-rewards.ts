import { useState, useEffect } from "react";
import { RewardData } from "./types";

const mockRewardData: RewardData = {
  totalRides: 47,
  ridesNeeded: 10,
  currentCycleRides: 7, // 7 out of 10 rides completed for the next free ride
  vouchers: [
    { id: "v_001", code: "FREE-RIDE-A1B2", status: "AVAILABLE", expiresAt: "2026-04-30T23:59:59Z", rideOrigin: "10th Ride Reward" },
    { id: "v_002", code: "FREE-RIDE-C3D4", status: "USED", expiresAt: "2026-03-15T23:59:59Z", rideOrigin: "Previous Reward" },
  ]
};

export function useRewards() {
  const [data, setData] = useState<RewardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [activeVoucher, setActiveVoucher] = useState<string | null>(null);

  // Simulate API Fetch
  const fetchRewards = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    setData(mockRewardData);
    setIsLoading(false);
  };

  useEffect(() => { fetchRewards(); }, []);

  const redeemVoucher = (voucherId: string) => {
    // Backend Proof: Later this will be a POST /api/rewards/redeem
    if (!data) return;
    const updatedVouchers = data.vouchers.map(v => 
      v.id === voucherId ? { ...v, status: "ACTIVE" as const } : v
    );
    setData({ ...data, vouchers: updatedVouchers });
    setActiveVoucher(voucherId);
    setShowVoucherModal(true);
  };

  const progressPercent = data ? (data.currentCycleRides / data.ridesNeeded) * 100 : 0;
  const ridesRemaining = data ? data.ridesNeeded - data.currentCycleRides : 0;

  return { 
    data, isLoading, progressPercent, ridesRemaining, 
    showVoucherModal, setShowVoucherModal, activeVoucher, redeemVoucher 
  };
}