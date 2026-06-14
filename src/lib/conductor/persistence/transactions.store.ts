// src/lib/conductor/persistence/transactions.store.ts

import type { TransactionType } from "../types";

export interface Transaction {
  transactionId: string;
  shiftId: string;
  type: TransactionType;
  amount: number;
  passengerCount?: number;
  description: string;
  timestamp: number;
}
