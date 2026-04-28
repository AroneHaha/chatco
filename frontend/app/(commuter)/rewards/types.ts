// app/(commuter)/rewards/types.ts
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
  vouchers: Voucher[];
}

// --- ANNOUNCEMENT TYPES ---
export type AnnouncementType = "SYSTEM" | "PROMO" | "MAINTENANCE" | "SAFETY";

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}