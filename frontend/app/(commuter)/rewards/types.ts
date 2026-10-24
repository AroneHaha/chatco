// app/(commuter)/rewards/types.ts
// Re-exports Announcement from canonical @/types to avoid duplication.
// Only Reward/Voucher types are local to this module.

export type { AnnouncementType, Announcement } from "@/types";

export type VoucherStatus = "AVAILABLE" | "USED" | "EXPIRED";

export interface Voucher {
  id: string;
  code: string;
  type: "FREE_RIDE" | "DISCOUNT" | "REWARD";
  amount: number | null;
  status: VoucherStatus;
  expiresAt: string;
  rideOrigin: string; // e.g., "10th Ride Reward"
}

/** A voucher as the wallet tabs list it (GET /api/commuter/vouchers). */
export interface WalletVoucher extends Voucher {
  /** When the ride it paid for was recorded (used vouchers only). */
  usedAt: string | null;
  /** "Pickup → Dropoff" of that ride (used vouchers only). */
  usedRoute: string | null;
}

export type VoucherTab = "available" | "used" | "expired";

export interface RewardData {
  totalRides: number;
  ridesNeeded: number; // The threshold (e.g., 10)
  currentCycleRides: number; // Rides in the current cycle (e.g., 7)
  availableVoucherCount: number;
  archivedVoucherCount: number;
  vouchers: Voucher[];
}
