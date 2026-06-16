/**
 * Canonical Lost & Found types for the Chatco application.
 *
 * Architecture notes (Laravel + Supabase):
 * - LostItem maps to the `lost_items` Supabase table
 * - ClaimData maps to the `claims` Supabase table
 *
 * This file is the SINGLE SOURCE OF TRUTH for lost-and-found types.
 * Do NOT re-define LostItem, ClaimData, or related types elsewhere.
 */

export type ItemCategory =
  | "ALL"
  | "ACCESSORY"
  | "BAG"
  | "WALLET"
  | "GADGET"
  | "CLOTHING"
  | "DOCUMENT"
  | "OTHER";

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
