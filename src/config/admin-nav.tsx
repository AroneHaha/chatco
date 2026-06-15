import {
  Home,
  Receipt,
  Map,
  Package,
  BarChart3,
  Car,
  Sliders,
  Users,
  FileText,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─── Nav Item Interface ─── */

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/* ─── Desktop Sidebar Nav Groups ─── */

export const operationsNav: NavItem[] = [
  { href: "/admin-dashboard", label: "Dashboard", icon: Home },
  { href: "/remittance", label: "Remittance", icon: Receipt },
  { href: "/receipts", label: "Receipts", icon: FileText },
  { href: "/monitoring", label: "Monitoring", icon: Map },
];

export const managementNav: NavItem[] = [
  { href: "/vehicles", label: "Fleet Management", icon: Car },
  { href: "/lost-found", label: "Lost & Found", icon: Package },
  { href: "/users", label: "User Management", icon: Users },
];

export const systemNav: NavItem[] = [
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Sliders },
];

/* ─── Mobile Bottom Nav ─── */

export const mobileMainItems: NavItem[] = [
  { href: "/admin-dashboard", label: "Home", icon: Home },
  { href: "/remittance", label: "Remit", icon: Receipt },
  { href: "/monitoring", label: "Map", icon: Map },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
];

export const mobileOverflowItems: NavItem[] = [
  { href: "/receipts", label: "Receipts", icon: FileText },
];

export const mobileMoreItems: NavItem[] = [
  { href: "/vehicles", label: "Fleet Management", icon: Car },
  { href: "/lost-found", label: "Lost & Found", icon: Package },
  { href: "/users", label: "User Management", icon: Users },
  { href: "/settings", label: "Settings", icon: Sliders },
];

/* ─── Settings sub-routes (for active-state matching) ─── */

export const settingsSubRoutes = [
  "/settings/fare-matrix",
  "/settings/financial-rules",
  "/settings/voucher-generator",
  "/settings/safety-notifications",
  "/settings/app-configuration",
  "/settings/remittance-options",
  "/settings/operations-rules",
  "/settings/routes",
  "/settings/faq-management",
];