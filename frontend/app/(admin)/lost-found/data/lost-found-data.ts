// app/(admin)/lost-found/data/lost-found-data.ts

// --- Types ---

export type ItemCategory = 'ACCESSORY' | 'BAG' | 'WALLET' | 'GADGET' | 'CLOTHING' | 'DOCUMENT' | 'OTHER';

export type ItemStatus = 'Unmatched' | 'Claimed' | 'Released' | 'Returned' | 'Rejected' | 'Closed' | 'Expired';

export type ClaimStatus = 'Pending' | 'Approved' | 'Rejected' | 'Released' | 'Returned';

export interface LostFoundItem {
  id: string;
  itemName: string;
  description: string;
  imageUrl: string;
  plateNumber: string;
  driverName: string;
  conductorName: string;
  estimatedTimeLost: string;
  category: ItemCategory;
  datePosted: string;
  reporterName: string;
  status: ItemStatus;
  claimedBy: string | null;
  /** Admin who released/closed this item (admin-only); null until released. */
  closedByName: string | null;
  /** When this item was auto-expired; null if never expired. */
  expiredAt: string | null;
  /** Up to 3 photos, position 0 first (the thumbnail — same URL as imageUrl). */
  photos: { id: string; url: string }[];
}

export interface Claim {
  id: string;
  itemId: string;
  claimantName: string;
  claimantContact: string;
  claimantEmail?: string;
  claimDate: string;
  status: ClaimStatus;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  releasedAt?: string | null;
  /** Admin who approved/rejected this claim; null until reviewed. */
  reviewedByName?: string | null;
  /** The commuter's proof-of-ownership description (admin review only). */
  proof?: string;
  /** The registered account that filed this claim; null/undefined for walk-in claimants. */
  linkedAccount?: { id: string; name: string; username: string; accountStatus: string } | null;
}

export interface HistoryEvent {
  id: string;
  itemId: string;
  action: string;
  details: string;
  timestamp: string;
}

// --- Category lists ---

export const itemCategories: { value: ItemCategory; label: string }[] = [
  { value: 'ACCESSORY', label: 'Accessories' },
  { value: 'BAG', label: 'Bags' },
  { value: 'WALLET', label: 'Wallets' },
  { value: 'GADGET', label: 'Gadgets' },
  { value: 'CLOTHING', label: 'Clothing' },
  { value: 'DOCUMENT', label: 'Documents' },
  { value: 'OTHER', label: 'Other' },
];

export const itemCategoriesWithAll: { value: ItemCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Items' },
  ...itemCategories,
];

// Note: This file used to export `initialLostFoundItems`, `initialClaims`,
// and `initialHistoryLog` mock arrays. They were removed because the
// lost-found page now fetches real data via `lost-found.service.ts`
// (listForAdmin / claimsForItem / etc.) wired to /api/admin/lost-items.
// Only the type definitions + category lists above remain in use.
