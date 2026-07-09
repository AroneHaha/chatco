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
  vehiclePlate: string;
  date: string;
  remittedAmount: number;
  cashAmount: number;
  gcashAmount: number;
  status: "Remitted" | "Pending";
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
