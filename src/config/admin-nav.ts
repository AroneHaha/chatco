// config/admin-nav.ts
import {
  Bus,
  Shield,
  Eye,
  Users,
  BarChart3,
  Receipt,
  Truck,
  Settings,
  MapPin,
  Search,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

// ── Desktop sidebar groups ──

export const operationsNav: NavItem[] = [
  { href: '/admin-dashboard', icon: Bus, label: 'Dashboard' },
  { href: '/monitoring', icon: Eye, label: 'Monitoring' },
  { href: '/remittance', icon: Receipt, label: 'Remittance' },
];

export const managementNav: NavItem[] = [
  { href: '/vehicles', icon: Truck, label: 'Fleet' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/users', icon: Users, label: 'Users' },
];

export const systemNav: NavItem[] = [
  { href: '/settings', icon: Settings, label: 'Settings' },
];

// ── Mobile bottom nav ──

export const mobileMainItems: NavItem[] = [
  { href: '/admin-dashboard', icon: Bus, label: 'Home' },
  { href: '/monitoring', icon: Eye, label: 'Monitor' },
  { href: '/remittance', icon: Receipt, label: 'Receipts' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export const mobileOverflowItems: NavItem[] = [
  { href: '/remittance', icon: Receipt, label: 'Receipts' },
];

export const mobileMoreItems: NavItem[] = [
  { href: '/vehicles', icon: Truck, label: 'Fleet' },
  { href: '/users', icon: Users, label: 'Users' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];
