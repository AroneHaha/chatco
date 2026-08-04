export type ItemCategory = "ALL" | "ACCESSORY" | "BAG" | "WALLET" | "GADGET" | "CLOTHING" | "DOCUMENT" | "OTHER";
export type ClaimStatus = "NONE" | "PENDING" | "VALIDATED" | "REJECTED" | "RELEASED";
export type ClaimFilter = "ALL" | Exclude<ClaimStatus, "NONE">;
export type ViewTab = "ALL" | "WATCHLIST" | "MY_CLAIMS";

export interface LostItem {
  id: string;
  itemName: string;
  description: string;
  imageUrl: string;
  plateNumber: string;
  driverName: string;
  conductorName: string;
  estimatedTimeLost: string; 
  category: Exclude<ItemCategory, "ALL">;
  datePosted: string;
}

export interface ClaimData {
  /** The backend claim row id — needed to cancel (withdraw) the claim. */
  claimId: string;
  status: Exclude<ClaimStatus, "NONE">;
  proof: string;
  claimDate: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  releasedAt: string | null;
  rejectionReason: string | null;
  /** The claimed item (eager-loaded by GET /commuter/claims); null if deleted. */
  item: LostItem | null;
}

export interface PaginatedAPIResponse {
  items: LostItem[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
}
