import {
  TrendingUp,
  MapPin,
  Banknote,
  Calculator,
  Receipt,
  Ticket,
  Bell,
  SlidersHorizontal,
  User2Icon,
  type LucideIcon,
} from "lucide-react";

/* ─── INTERFACES (API Contracts — keep these) ─── */

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

export interface PaymentTendencies {
  gcash: number;
  cash: number;
}

export interface DashboardData {
  recentVehicles: VehicleItem[];
  recentLostFound: LostFoundItem[];
  recentUsers: UserItem[];
  quickStats: StatItem[];
  settingsModules: SettingsModule[];
  topPickupPoints: PickupPoint[];
  paymentTendencies: PaymentTendencies;
}

/* ─── CONSOLIDATED MOCK DATA (delete when API is ready) ─── */

export const MOCK_DASHBOARD_DATA: DashboardData = {
  recentVehicles: [
    { unit: "XQJ 4728", driver: "Mhaku Jose Manalili", status: "Active" },
    { unit: "VMY 9183", driver: "Mark Arone Dela Cruz", status: "Maintenance" },
    { unit: "RZP 6041", driver: "Rod Erick Dulalia", status: "Active" },
  ],

  recentLostFound: [
    { item: "Black Backpack", status: "Under Review" },
    { item: "Brown Wallet", status: "Reported" },
    { item: "Student ID", status: "Returned" },
  ],

  recentUsers: [
    { name: "Mhaku Jose Manalili", role: "Commuter", status: "Active" },
    { name: "Mark Arone Dela Cruz", role: "Commuter", status: "Active" },
    { name: "Rod Dulalia", role: "Commuter", status: "Inactive" },
  ],

  quickStats: [
    { label: "Total Revenue Today", value: "₱14,500", icon: TrendingUp, color: "text-sky-400 bg-[#62A0EA]/15", link: "/analytics" },
    { label: "Total Rides Using E-Chatco", value: "9,500", icon: MapPin, color: "text-[#62A0EA] bg-[#62A0EA]/15", link: "/analytics" },
    { label: "Active Users", value: "2,340", icon: User2Icon, color: "text-violet-400 bg-violet-400/15", link: "/analytics" },
    { label: "Pending Remittance", value: "₱8,400", icon: Banknote, color: "text-amber-400 bg-amber-400/15", link: "/remittance" },
  ],

  settingsModules: [
    { title: "Fare Matrix", desc: "Set base fares and distance rates.", icon: Calculator, iconColor: "text-[#62A0EA]", gradient: "linear-gradient(135deg, rgba(98, 160, 234, 0.2) 0%, rgba(98, 160, 234, 0.05) 100%)", href: "/settings/fare-matrix" },
    { title: "Financial Rules", desc: "Configure fare deductions and splits.", icon: Receipt, iconColor: "text-sky-400", gradient: "linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0.05) 100%)", href: "/settings/financial-rules" },
    { title: "Voucher Generator", desc: "Create promo codes and free ride passes.", icon: Ticket, iconColor: "text-violet-400", gradient: "linear-gradient(135deg, rgba(167, 139, 250, 0.2) 0%, rgba(167, 139, 250, 0.05) 100%)", href: "/settings/voucher-generator" },
    { title: "Safety Notifications", desc: "Manage alert triggers and templates.", icon: Bell, iconColor: "text-amber-400", gradient: "linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(251, 191, 36, 0.05) 100%)", href: "/settings/safety-notifications" },
    { title: "App Configuration", desc: "General system preferences and UI.", icon: SlidersHorizontal, iconColor: "text-pink-400", gradient: "linear-gradient(135deg, rgba(244, 114, 182, 0.2) 0%, rgba(244, 114, 182, 0.05) 100%)", href: "/settings/app-configuration" },
    { title: "Remittance Options", desc: "Add or edit remittance recipients.", icon: Banknote, iconColor: "text-cyan-400", gradient: "linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(34, 211, 238, 0.05) 100%)", href: "/settings/remittance-options" },
  ],

  topPickupPoints: [
    { name: "Malolos Terminal", val: 1420 },
    { name: "Meycauayan Crossing", val: 980 },
    { name: "Calumpit Town Proper", val: 740 },
  ],

  paymentTendencies: {
    gcash: 78,
    cash: 22,
  },
};

/* ─── DATA HOOK ─── */

export function useDashboardData() {
  // TODO: Replace MOCK_DASHBOARD_DATA with API call
  // e.g. const { data, isLoading, error } = useSWR('/api/admin/dashboard', fetcher);
  return {
    data: MOCK_DASHBOARD_DATA,
    isLoading: false,
    error: null as string | null,
    refetch: () => {
      // TODO: trigger SWR mutate or refetch
    },
  };
}