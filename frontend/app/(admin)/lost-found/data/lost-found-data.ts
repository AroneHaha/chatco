// app/(admin)/lost-found/data/lost-found-data.ts
//
// Admin Lost & Found data layer.
// All mock data removed. Data is fetched from the Laravel API via BFF.
// API responses are auto-transformed from snake_case to camelCase by lib/api.ts.
//
// DB tables referenced: lost_items, claims, lost_item_events, watchlist

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ── Types (camelCase, matching transformed API responses) ────────────

export type ItemCategory = 'ACCESSORY' | 'BAG' | 'WALLET' | 'GADGET' | 'CLOTHING' | 'DOCUMENT' | 'OTHER';
export type ItemStatus = 'Unmatched' | 'Claimed' | 'Released' | 'Returned' | 'Rejected';
export type ClaimStatus = 'Pending' | 'Approved' | 'Rejected' | 'Released' | 'Returned';

// ── Interfaces matching DB: lost_items ───────────────────────────────

export interface LostFoundItem {
  id: string;                    // varchar(20) PK
  itemName: string;              // varchar(200)
  description: string | null;    // text
  imageUrl: string | null;       // varchar(500)
  plateNumber: string | null;    // varchar(20)
  driverName: string | null;     // varchar(100)
  conductorName: string | null;  // varchar(100)
  vehicleId?: string | null;     // uuid
  estimatedTimeLost: string | null; // varchar(100)
  category: string | null;       // varchar(20)
  reportedById?: string;         // uuid NOT NULL
  reportedByRole?: string;       // varchar(20) NOT NULL
  reporterName: string | null;   // varchar(100) — may be joined from users table
  status: string;                // varchar(20)
  claimedBy: string | null;      // varchar(100)
  datePosted?: string;           // alias — comes from created_at via API
  createdAt?: string;
  updatedAt?: string;
}

// ── Interfaces matching DB: claims ───────────────────────────────────

export interface Claim {
  id: string;                    // uuid PK
  itemId: string;                // varchar(20) NOT NULL
  claimantId?: string;           // uuid NOT NULL
  claimantName: string;          // varchar(100) NOT NULL
  claimantContact: string;       // varchar(20) NOT NULL
  claimantEmail: string;         // varchar(255) NOT NULL
  status: string;                // varchar(20)
  proof?: string | null;         // varchar(500)
  claimDate?: string;            // alias — comes from created_at via API
  createdAt?: string;
  updatedAt?: string;
}

// ── Interfaces matching DB: lost_item_events ─────────────────────────

export interface HistoryEvent {
  id: string;                    // uuid PK
  itemId: string;                // varchar(20) NOT NULL
  action: string | null;         // varchar(50)
  details: string | null;        // text
  timestamp?: string;            // alias — comes from created_at via API
  createdAt?: string;
}

// ── Category lists (static config, not mock data) ────────────────────

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

// ── Initial defaults (used by page component for local state) ────────

export const initialLostFoundItems: LostFoundItem[] = [];
export const initialClaims: Claim[] = [];
export const initialHistoryLog: HistoryEvent[] = [];

// ── API response shape ────────────────────────────────────────────────

interface LostFoundListResponse {
  items: LostFoundItem[];
  claims: Claim[];
  historyLog: HistoryEvent[];
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useLostFoundData() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [historyLog, setHistoryLog] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<LostFoundListResponse>('/api/admin/lost-items');
      setItems(result.items ?? []);
      setClaims(result.claims ?? []);
      setHistoryLog(result.historyLog ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load lost & found data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, claims, historyLog, isLoading, error, refetch, setItems, setClaims, setHistoryLog };
}