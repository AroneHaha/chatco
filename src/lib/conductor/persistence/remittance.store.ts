// src/lib/conductor/persistence/remittance.store.ts

export interface RemittanceRecord {
  remittanceId: string;
  shiftId: string;
  totalFare: number;
  totalCargo: number;
  totalSpecial: number;
  grandTotal: number;
  submittedAt: number;
  status: "pending" | "verified" | "flagged";
}
