// app/(admin)/analytics/data/analytics-data.ts

/* ─── INTERFACES (API Contracts — keep these) ─── */
/* The analytics page now fetches real data from /api/admin/analytics.    */
/* These types are kept because the tabbed page's "Detailed Reports" tab   */
/* imports them for its table components.                                   */

export type HeatmapIntensity = "Critical" | "High" | "Moderate" | "Low";

export interface HeatmapZone {
  zone: string;
  commuters: number;
  intensity: HeatmapIntensity;
  color: string;
}

export interface PaymentMethodUsage {
  method: string;
  transactions: number;
  percentage: number;
  amount: string;
  color: string;
  icon: string;
}

export interface PickupPoint {
  name: string;
  count: number;
}

export interface AnalyticsRemittance {
  shiftId: string;
  conductor: string;
  unit: string;
  date: string;
  cashAmount: number;
  gcashAmount: number;
  /** Cash the admin counted; null while the remittance is still awaited. */
  remittedAmount: number | null;
  shortage: number;
  overage: number;
  /** Backend Remittance status: COMPLETE | SHORTAGE | OVERAGE | PENDING. */
  status: string;
}

export interface GCashTransactionDaily {
  day: string;
  transactions: number;
  revenue: string;
}

export interface GCashTransactionMonthly {
  month: string;
  transactions: number;
  revenue: string;
}

export interface AnalyticsData {
  heatmapZones: HeatmapZone[];
  paymentUsage: PaymentMethodUsage[];
  pickupPoints: PickupPoint[];
  remittanceData: AnalyticsRemittance[];
  gcashDaily: GCashTransactionDaily[];
  gcashMonthly: GCashTransactionMonthly[];
}

/* ─── No mock data — the analytics page uses lib/admin/services/analytics.service.ts ─── */
