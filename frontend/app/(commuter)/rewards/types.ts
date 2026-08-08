// app/(commuter)/rewards/types.ts
// Re-exports Announcement from canonical @/types to avoid duplication.
// Only Reward/Voucher types are local to this module.

export type { AnnouncementType, Announcement } from "@/types";

export type VoucherStatus = "AVAILABLE" | "ACTIVE" | "USED" | "EXPIRED";

export interface Voucher {
  id: string;
  code: string;
  status: VoucherStatus;
  expiresAt: string;
  rideOrigin: string; // e.g., "10th Ride Reward"
}

export interface RewardData {
  totalRides: number;
  ridesNeeded: number; // The threshold (e.g., 10)
  currentCycleRides: number; // Rides in the current cycle (e.g., 7)
  availableVoucherCount: number;
  vouchers: Voucher[];
}
