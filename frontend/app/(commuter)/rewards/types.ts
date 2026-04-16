export type VoucherStatus = "AVAILABLE" | "ACTIVE" | "USED" | "EXPIRED";

export interface Voucher {
  id: string;
  code: string;
  status: VoucherStatus;
  expiresAt: string;
  rideOrigin: string; // e.g., "Ride #12"
}

export interface RewardData {
  totalRides: number;
  ridesNeeded: number; // The threshold (e.g., 10)
  currentCycleRides: number; // Rides in the current cycle (e.g., 7)
  vouchers: Voucher[];
}