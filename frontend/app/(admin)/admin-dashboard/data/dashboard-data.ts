import {
  TrendingUp,
  MapPin,
  Wallet,
  Banknote,
  Calculator,
  Receipt,
  Ticket,
  Bell,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

/* ─── TYPES ─── */
export interface VehicleItem {
  unit: string;
  driver: string;
  status: "Active" | "Maintenance";
}

export interface LostFoundItem {
  item: string;
  status: "Under Review" | "Reported" | "Returned";
}

export interface UserItem {
  name: string;
  role: string;
  status: "Active" | "Inactive";
}

export interface StatItem {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  link: string;
}

export interface SettingsModule {
  title: string;
  desc: string;
  icon: LucideIcon;
  iconColor: string;
  gradient: string;
  href: string;
}

export interface PickupPoint {
  name: string;
  val: number;
}

/* ─── DATA ─── */
export const recentVehicles: VehicleItem[] = [
  { unit: "XQJ 4728", driver: "Mhaku Jose Manalili", status: "Active" },
  { unit: "VMY 9183", driver: "Mark Arone Dela Cruz", status: "Maintenance" },
  { unit: "RZP 6041", driver: "Rod Erick Dulalia", status: "Active" },
];

export const recentLostFound: LostFoundItem[] = [
  { item: "Black Backpack", status: "Under Review" },
  { item: "Brown Wallet", status: "Reported" },
  { item: "Student ID", status: "Returned" },
];

export const recentUsers: UserItem[] = [
  { name: "Ana Lim", role: "Commuter", status: "Active" },
  { name: "Marco Reyes", role: "Operator", status: "Active" },
  { name: "Juan Dela Cruz", role: "Driver", status: "Inactive" },
];

export const quickStats: StatItem[] = [
  { label: "Net Profit (Today)", value: "₱14,500", icon: TrendingUp, color: "text-green-400 bg-green-500/15", link: "/analytics" },
  { label: "Total Rides (Week)", value: "9,500", icon: MapPin, color: "text-[#62A0EA] bg-[#1A5FB4]/15", link: "/analytics" },
  { label: "Active Wallets", value: "2,340", icon: Wallet, color: "text-purple-400 bg-purple-500/15", link: "/analytics" },
  { label: "Pending Remittance", value: "₱8,400", icon: Banknote, color: "text-amber-400 bg-amber-500/15", link: "/remittance" },
];

export const settingsModules: SettingsModule[] = [
  { 
    title: "Fare Matrix", 
    desc: "Set base fares and distance rates.", 
    icon: Calculator, 
    iconColor: "text-blue-400", 
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.05) 100%)",
    href: "/settings/fare-matrix" 
  },
  { 
    title: "Financial Rules", 
    desc: "Configure fare deductions and splits.", 
    icon: Receipt, 
    iconColor: "text-green-400", 
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.05) 100%)",
    href: "/settings/financial-rules" 
  },
  { 
    title: "Voucher Generator", 
    desc: "Create promo codes and free ride passes.", 
    icon: Ticket, 
    iconColor: "text-purple-400", 
    gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.05) 100%)",
    href: "/settings/voucher-generator" 
  },
  { 
    title: "Safety Notifications", 
    desc: "Manage alert triggers and templates.", 
    icon: Bell, 
    iconColor: "text-amber-400", 
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.05) 100%)",
    href: "/settings/safety-notifications" 
  },
  { 
    title: "App Configuration", 
    desc: "General system preferences and UI.", 
    icon: SlidersHorizontal, 
    iconColor: "text-pink-400", 
    gradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(219, 39, 119, 0.05) 100%)",
    href: "/settings/app-configuration" 
  },
  { 
    title: "Remittance Options", 
    desc: "Add or edit remittance recipients.", 
    icon: Banknote, 
    iconColor: "text-cyan-400", 
    gradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(8, 145, 178, 0.05) 100%)",
    href: "/settings/remittance-options" 
  },
];

export const topPickupPoints: PickupPoint[] = [
  { name: "Malolos Terminal", val: 1420 },
  { name: "Meycauayan Crossing", val: 980 },
  { name: "Calumpit Town Proper", val: 740 },
];