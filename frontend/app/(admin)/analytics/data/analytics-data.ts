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
  status: 'Remitted' | 'Pending';
}

export interface TopUpDaily {
  day: string;
  topups: number;
  revenue: string;
}

export interface TopUpMonthly {
  month: string;
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
  { method: "Self-Pay (Online/App)", transactions: 4200, percentage: 65, amount: "₱84,000", color: "bg-[#1A5FB4]", icon: "📱" },
  { method: "Conductor Scan (Commuter QR)", transactions: 1575, percentage: 24, amount: "₱31,500", color: "bg-[#62A0EA]", icon: "📷" },
  { method: "Offline Wallet (Conductor Device)", transactions: 715, percentage: 11, amount: "₱14,300", color: "bg-purple-500", icon: "💻" },
];

export const initialPickupPoints: PickupPoint[] = [
  { name: "Malolos Terminal", count: 2450 },
  { name: "Meycauayan Crossing", count: 1820 },
  { name: "Calumpit Town Proper", count: 1240 },
  { name: "Guiguinto Stop", count: 890 },
  { name: "Marilao Highroad", count: 650 },
];

export const initialRemittanceData: AnalyticsRemittance[] = [
  { shiftId: "S - 101", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-01", remittedAmount: 2500, status: "Remitted" },
  { shiftId: "S - 109", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-05", remittedAmount: 3100, status: "Remitted" },
  { shiftId: "S - 117", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-09", remittedAmount: 3000, status: "Pending" },
  { shiftId: "S - 125", conductor: "Jose Ngani", vehiclePlate: "XQJ 4728", date: "2024-05-13", remittedAmount: 1800, status: "Pending" },
  { shiftId: "S - 102", conductor: "Ericks Son", vehiclePlate: "LKW 3579", date: "2024-05-01", remittedAmount: 2200, status: "Remitted" },
  { shiftId: "S - 110", conductor: "Ericks Son", vehiclePlate: "LKW 3579", date: "2024-05-05", remittedAmount: 2050, status: "Pending" },
  { shiftId: "S - 118", conductor: "Ericks Son", vehiclePlate: "LKW 3579", date: "2024-05-09", remittedAmount: 2450, status: "Remitted" },
  { shiftId: "S - 103", conductor: "Pedro Penduko", vehiclePlate: "VMY 9183", date: "2024-05-02", remittedAmount: 2600, status: "Pending" },
  { shiftId: "S - 111", conductor: "Pedro Penduko", vehiclePlate: "VMY 9183", date: "2024-05-06", remittedAmount: 2750, status: "Remitted" },
  { shiftId: "S - 119", conductor: "Pedro Penduko", vehiclePlate: "VMY 9183", date: "2024-05-10", remittedAmount: 3200, status: "Remitted" },
  { shiftId: "S - 104", conductor: "Luigi Mansion", vehiclePlate: "RZP 6041", date: "2024-05-02", remittedAmount: 2000, status: "Remitted" },
  { shiftId: "S - 112", conductor: "Luigi Mansion", vehiclePlate: "RZP 6041", date: "2024-05-06", remittedAmount: 2300, status: "Remitted" },
  { shiftId: "S - 120", conductor: "Luigi Mansion", vehiclePlate: "RZP 6041", date: "2024-05-10", remittedAmount: 2100, status: "Pending" },
  { shiftId: "S - 105", conductor: "Sisa Doe", vehiclePlate: "TNB 8462", date: "2024-05-03", remittedAmount: 2100, status: "Pending" },
  { shiftId: "S - 113", conductor: "Sisa Doe", vehiclePlate: "TNB 8462", date: "2024-05-07", remittedAmount: 2650, status: "Remitted" },
  { shiftId: "S - 121", conductor: "Sisa Doe", vehiclePlate: "TNB 8462", date: "2024-05-11", remittedAmount: 2700, status: "Remitted" },
  { shiftId: "S - 106", conductor: "Juan Dela Cruz", vehiclePlate: "JHX 7905", date: "2024-05-03", remittedAmount: 2800, status: "Remitted" },
  { shiftId: "S - 114", conductor: "Juan Dela Cruz", vehiclePlate: "JHX 7905", date: "2024-05-07", remittedAmount: 2150, status: "Pending" },
  { shiftId: "S - 122", conductor: "Juan Dela Cruz", vehiclePlate: "JHX 7905", date: "2024-05-11", remittedAmount: 2550, status: "Remitted" },
  { shiftId: "S - 107", conductor: "Maria Makiling", vehiclePlate: "PVR 6894", date: "2024-05-04", remittedAmount: 2400, status: "Remitted" },
  { shiftId: "S - 115", conductor: "Maria Makiling", vehiclePlate: "PVR 6894", date: "2024-05-08", remittedAmount: 2850, status: "Remitted" },
  { shiftId: "S - 123", conductor: "Maria Makiling", vehiclePlate: "PVR 6894", date: "2024-05-12", remittedAmount: 2900, status: "Pending" },
  { shiftId: "S - 108", conductor: "Mhaku Jose", vehiclePlate: "QFD 2316", date: "2024-05-04", remittedAmount: 1900, status: "Pending" },
  { shiftId: "S - 116", conductor: "Mhaku Jose", vehiclePlate: "QFD 2316", date: "2024-05-08", remittedAmount: 1950, status: "Remitted" },
  { shiftId: "S - 124", conductor: "Mhaku Jose", vehiclePlate: "QFD 2316", date: "2024-05-12", remittedAmount: 3400, status: "Remitted" },
  { shiftId: "S - 126", conductor: "Karding Dela Paz", vehiclePlate: "LKW 3579", date: "2024-05-05", remittedAmount: 2050, status: "Pending" },
];

export const initialTopUpDaily: TopUpDaily[] = [
  { day: "Monday", topups: 120, revenue: "₱12,000" },
  { day: "Tuesday", topups: 105, revenue: "₱10,500" },
  { day: "Wednesday", topups: 130, revenue: "₱13,000" },
  { day: "Thursday", topups: 90, revenue: "₱9,000" },
  { day: "Friday", topups: 150, revenue: "₱15,000" },
  { day: "Saturday", topups: 80, revenue: "₱8,000" },
  { day: "Sunday", topups: 45, revenue: "₱4,500" },
];

export const initialTopUpMonthly: TopUpMonthly[] = [
  { month: "July", revenue: "₱245,000" },
  { month: "August", revenue: "₱268,000" },
  { month: "September", revenue: "₱290,000" },
  { month: "October", revenue: "₱315,000" },
];