// app/(admin)/lost-found/data/lost-found-data.ts

// --- Types ---

export type ItemCategory = 'ACCESSORY' | 'BAG' | 'WALLET' | 'GADGET' | 'CLOTHING' | 'DOCUMENT' | 'OTHER';

export type ItemStatus = 'Unmatched' | 'Claimed' | 'Released' | 'Returned' | 'Rejected' | 'Closed';

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
}

export interface Claim {
  id: string;
  itemId: string;
  claimantName: string;
  claimantContact: string;
  claimantEmail?: string;
  claimDate: string;
  status: ClaimStatus;
  /** The commuter's proof-of-ownership description (admin review only). */
  proof?: string;
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