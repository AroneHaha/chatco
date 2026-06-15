export type ItemCategory = "ALL" | "ACCESSORY" | "BAG" | "WALLET" | "GADGET" | "CLOTHING" | "DOCUMENT" | "OTHER";
export type ClaimStatus = "NONE" | "PENDING" | "VALIDATED" | "REJECTED";
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
  status: ClaimStatus;
  proof: string;
}

export interface PaginatedAPIResponse {
  items: LostItem[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
}