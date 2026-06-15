// app/(admin)/receipts/data/receipts-data.ts
//
// Admin Receipts data layer.
// All mock data removed. Data is fetched from the Laravel API via BFF.
// API responses are auto-transformed from snake_case to camelCase by lib/api.ts.
//
// DB tables referenced: transactions, shift_logs, fare_points, vouchers,
//   commuter_profiles, conductor_profiles, drivers, vehicles

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ── Interfaces matching DB: transactions (camelCase) ─────────────────

export type PaymentMethod = 'Cash' | 'Gcash' | 'Gcash_Scan' | 'Voucher';
export type ReceiptStatus = 'Completed' | 'Pending' | 'Refunded';

export interface Receipt {
  transactionId: string;           // varchar(30) PK
  shiftId?: string;                // varchar(20) NOT NULL
  paymentMethod: string;           // varchar(20) NOT NULL
  finalAmount: number;             // decimal(10,2) NOT NULL
  passengerId?: string | null;     // uuid
  passengerName: string | null;    // varchar(100)
  passengerRole?: string | null;   // varchar(20)
  pickupStopId?: string;           // uuid NOT NULL
  dropoffStopId?: string;          // uuid NOT NULL
  pickupName?: string | null;      // varchar(100)
  dropoffName?: string | null;     // varchar(100)
  distance?: number | null;        // decimal(10,2)
  baseFare?: number | null;        // decimal(10,2)
  succeedingKm?: number | null;    // decimal(10,2)
  discountAmount?: number | null;  // decimal(10,2)
  conductorName?: string | null;   // varchar(100)
  unitNumber?: string | null;      // varchar(20)
  driverName?: string | null;      // varchar(100)
  voucherId?: string | null;       // uuid
  createdAt?: string;
  updatedAt?: string;
  // Legacy aliases used by page component
  id: string;                      // alias for transactionId
  commuterName: string | null;     // alias for passengerName
  commuterId?: string | null;      // alias for passengerId
  date: string;                    // alias for createdAt
  time: string;                    // alias for createdAt
  fare: number;                    // alias for finalAmount
  route?: string | null;           // from joined route name
  plateNumber?: string | null;     // from joined vehicle
  status?: string;     
}

// ── Initial defaults (used by page component for local state) ────────

export const initialReceiptData: Receipt[] = [];

// ── API response shape ────────────────────────────────────────────────

interface ReceiptsListResponse {
  receipts: Receipt[];
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useReceiptsData() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<ReceiptsListResponse>('/api/admin/receipts');
      setReceipts(result.receipts ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load receipts';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { receipts, isLoading, error, refetch, setReceipts };
}