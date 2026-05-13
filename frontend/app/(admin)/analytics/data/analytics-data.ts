// app/(admin)/analytics/data/analytics-data.ts

// --- Types ---

export type HeatmapIntensity = 'Critical' | 'High' | 'Moderate' | 'Low';

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
  status: 'Remitted' | 'Pending';
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

// --- Data (replace with API calls when backend is ready) ---

export const initialHeatmapZones: HeatmapZone[] = [
  { zone: "Malolos Terminal", commuters: 450, intensity: "Critical", color: "bg-red-500" },
  { zone: "Meycauayan Crossing", commuters: 320, intensity: "High", color: "bg-orange-500" },
  { zone: "Guiguinto Stop", commuters: 180, intensity: "Moderate", color: "bg-yellow-500" },
  { zone: "Marilao Highroad", commuters: 90, intensity: "Low", color: "bg-green-500" },
  { zone: "Calumpit Town Proper", commuters: 150, intensity: "Moderate", color: "bg-yellow-500" },
];

export const initialPaymentUsageData: PaymentMethodUsage[] = [
  { method: "GCash (QR Scan)", transactions: 4200, percentage: 65, amount: "₱84,000", color: "bg-blue-500", icon: "📱" },
  { method: "Cash", transactions: 1575, percentage: 24, amount: "₱31,500", color: "bg-emerald-500", icon: "💵" },
];

export const initialPickupPoints: PickupPoint[] = [
  { name: "Malolos Terminal", count: 2450 },
  { name: "Meycauayan Crossing", count: 1820 },
  { name: "Calumpit Town Proper", count: 1240 },
  { name: "Guiguinto Stop", count: 890 },
  { name: "Marilao Highroad", count: 650 },
];

export const initialRemittanceData: AnalyticsRemittance[] = [
  { shiftId: "S - 101", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-01", remittedAmount: 2500, cashAmount: 650, gcashAmount: 1850, status: "Remitted" },
  { shiftId: "S - 109", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-05", remittedAmount: 3100, cashAmount: 800, gcashAmount: 2300, status: "Remitted" },
  { shiftId: "S - 117", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-09", remittedAmount: 3000, cashAmount: 700, gcashAmount: 2300, status: "Pending" },
  { shiftId: "S - 125", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-13", remittedAmount: 1800, cashAmount: 500, gcashAmount: 1300, status: "Pending" },
  { shiftId: "S - 102", conductor: "Ericks Son", vehiclePlate: "LKW 3579", date: "2024-05-01", remittedAmount: 2200, cashAmount: 600, gcashAmount: 1600, status: "Remitted" },
  { shiftId: "S - 110", conductor: "Ericks Son", vehiclePlate: "LKW 3579", date: "2024-05-05", remittedAmount: 2050, cashAmount: 550, gcashAmount: 1500, status: "Pending" },
  { shiftId: "S - 118", conductor: "Ericks Son", vehiclePlate: "LKW 3579", date: "2024-05-09", remittedAmount: 2450, cashAmount: 700, gcashAmount: 1750, status: "Remitted" },
  { shiftId: "S - 103", conductor: "Pedro Penduko", vehiclePlate: "VMY 9183", date: "2024-05-02", remittedAmount: 2600, cashAmount: 750, gcashAmount: 1850, status: "Pending" },
  { shiftId: "S - 111", conductor: "Pedro Penduko", vehiclePlate: "VMY 9183", date: "2024-05-06", remittedAmount: 2750, cashAmount: 800, gcashAmount: 1950, status: "Remitted" },
  { shiftId: "S - 119", conductor: "Pedro Penduko", vehiclePlate: "VMY 9183", date: "2024-05-10", remittedAmount: 3200, cashAmount: 900, gcashAmount: 2300, status: "Remitted" },
  { shiftId: "S - 104", conductor: "Luigi Mansion", vehiclePlate: "RZP 6041", date: "2024-05-02", remittedAmount: 2000, cashAmount: 600, gcashAmount: 1400, status: "Remitted" },
  { shiftId: "S - 112", conductor: "Luigi Mansion", vehiclePlate: "RZP 6041", date: "2024-05-06", remittedAmount: 2300, cashAmount: 680, gcashAmount: 1620, status: "Remitted" },
  { shiftId: "S - 120", conductor: "Luigi Mansion", vehiclePlate: "RZP 6041", date: "2024-05-10", remittedAmount: 2100, cashAmount: 650, gcashAmount: 1450, status: "Pending" },
  { shiftId: "S - 105", conductor: "Sisa Doe", vehiclePlate: "TNB 8462", date: "2024-05-03", remittedAmount: 2100, cashAmount: 630, gcashAmount: 1470, status: "Pending" },
  { shiftId: "S - 113", conductor: "Sisa Doe", vehiclePlate: "TNB 8462", date: "2024-05-07", remittedAmount: 2650, cashAmount: 780, gcashAmount: 1870, status: "Remitted" },
  { shiftId: "S - 121", conductor: "Sisa Doe", vehiclePlate: "TNB 8462", date: "2024-05-11", remittedAmount: 2700, cashAmount: 810, gcashAmount: 1890, status: "Remitted" },
  { shiftId: "S - 106", conductor: "Juan Dela Cruz", vehiclePlate: "JHX 7905", date: "2024-05-03", remittedAmount: 2800, cashAmount: 850, gcashAmount: 1950, status: "Remitted" },
  { shiftId: "S - 114", conductor: "Juan Dela Cruz", vehiclePlate: "JHX 7905", date: "2024-05-07", remittedAmount: 2150, cashAmount: 650, gcashAmount: 1500, status: "Pending" },
  { shiftId: "S - 122", conductor: "Juan Dela Cruz", vehiclePlate: "JHX 7905", date: "2024-05-11", remittedAmount: 2550, cashAmount: 770, gcashAmount: 1780, status: "Remitted" },
  { shiftId: "S - 107", conductor: "Maria Makiling", vehiclePlate: "PVR 6894", date: "2024-05-04", remittedAmount: 2400, cashAmount: 720, gcashAmount: 1680, status: "Remitted" },
  { shiftId: "S - 115", conductor: "Maria Makiling", vehiclePlate: "PVR 6894", date: "2024-05-08", remittedAmount: 2850, cashAmount: 860, gcashAmount: 1990, status: "Remitted" },
  { shiftId: "S - 123", conductor: "Maria Makiling", vehiclePlate: "PVR 6894", date: "2024-05-12", remittedAmount: 2900, cashAmount: 870, gcashAmount: 2030, status: "Pending" },
  { shiftId: "S - 108", conductor: "Mhaku Jose", vehiclePlate: "QFD 2316", date: "2024-05-04", remittedAmount: 1900, cashAmount: 570, gcashAmount: 1330, status: "Pending" },
  { shiftId: "S - 116", conductor: "Mhaku Jose", vehiclePlate: "QFD 2316", date: "2024-05-08", remittedAmount: 1950, cashAmount: 590, gcashAmount: 1360, status: "Remitted" },
  { shiftId: "S - 124", conductor: "Mhaku Jose", vehiclePlate: "QFD 2316", date: "2024-05-12", remittedAmount: 3400, cashAmount: 950, gcashAmount: 2450, status: "Remitted" },
  { shiftId: "S - 126", conductor: "Karding Dela Paz", vehiclePlate: "LKW 3579", date: "2024-05-05", remittedAmount: 2050, cashAmount: 620, gcashAmount: 1430, status: "Pending" },
];

export const initialGCashTransactionDaily: GCashTransactionDaily[] = [
  { day: "Monday", transactions: 120, revenue: "₱12,000" },
  { day: "Tuesday", transactions: 105, revenue: "₱10,500" },
  { day: "Wednesday", transactions: 130, revenue: "₱13,000" },
  { day: "Thursday", transactions: 90, revenue: "₱9,000" },
  { day: "Friday", transactions: 150, revenue: "₱15,000" },
  { day: "Saturday", transactions: 80, revenue: "₱8,000" },
  { day: "Sunday", transactions: 45, revenue: "₱4,500" },
];

export const initialGCashTransactionMonthly: GCashTransactionMonthly[] = [
  { month: "July", transactions: 2450, revenue: "₱245,000" },
  { month: "August", transactions: 2680, revenue: "₱268,000" },
  { month: "September", transactions: 2900, revenue: "₱290,000" },
  { month: "October", transactions: 3150, revenue: "₱315,000" },
];