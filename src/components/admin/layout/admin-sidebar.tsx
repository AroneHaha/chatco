// components/admin/layout/admin-sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import {
  operationsNav,
  managementNav,
  systemNav,
} from '@/config/admin-nav';
import { SignOutModal } from '@/components/admin/ui/sign-out-modal';
import { SettingsDrawer } from '@/components/admin/ui/settings-drawer';

interface AdminSidebarProps {
  pathname: string;
  onSignOut: () => void;
  isSignOutOpen: boolean;
  setIsSignOutOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  openSettingsDrawer: () => void;
  children: React.ReactNode;
}

export function AdminSidebar({
  pathname,
  onSignOut,
  isSignOutOpen,
  setIsSignOutOpen,
  isSettingsOpen,
  openSettingsDrawer,
  children,
}: AdminSidebarProps) {
  return (
    <div className="flex h-screen bg-[#0B1120]">
      <nav className="w-64 bg-[#0D1424] border-r border-[#1E2D45] flex flex-col">
        {/* Logo */}
        <div className="p-5 flex items-center gap-3">
          <Image src="/logo-transparent.png" alt="CHATCO" width={36} height={36} className="flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-white leading-tight">CHATCO</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>

        {/* Nav Links — grouped */}
        <div className="flex-1 px-3 overflow-y-auto space-y-6">

          {/* Operations */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Operations</p>
            {operationsNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 my-0.5 rounded-md transition-colors duration-200 ${
                    isActive
                      ? 'bg-[#62A0EA]/10 text-[#62A0EA]'
                      : 'text-slate-400 hover:bg-[#1A2540] hover:text-white'
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#62A0EA] flex-shrink-0" />}
                  {!isActive && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Management */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Management</p>
            {managementNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 my-0.5 rounded-md transition-colors duration-200 ${
                    isActive
                      ? 'bg-[#62A0EA]/10 text-[#62A0EA]'
                      : 'text-slate-400 hover:bg-[#1A2540] hover:text-white'
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#62A0EA] flex-shrink-0" />}
                  {!isActive && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* System */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">System</p>
            {systemNav.map((item) => {
              const Icon = item.icon;
              const isSettings = item.href === '/settings';
              const isActive = isSettings ? pathname.startsWith('/settings') : pathname === item.href;

              // Settings opens drawer instead of navigating
              if (isSettings) {
                return (
                  <button
                    key={item.href}
                    onClick={openSettingsDrawer}
                    className={`flex items-center space-x-3 px-3 py-2.5 my-0.5 rounded-md transition-colors duration-200 w-full ${
                      isSettingsOpen || isActive
                        ? 'bg-[#62A0EA]/10 text-[#62A0EA]'
                        : 'text-slate-400 hover:bg-[#1A2540] hover:text-white'
                    }`}
                  >
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#62A0EA] flex-shrink-0" />}
                    {!isActive && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 my-0.5 rounded-md transition-colors duration-200 ${
                    isActive
                      ? 'bg-[#62A0EA]/10 text-[#62A0EA]'
                      : 'text-slate-400 hover:bg-[#1A2540] hover:text-white'
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#62A0EA] flex-shrink-0" />}
                  {!isActive && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

        </div>

        {/* --- Bottom Section (Sign Out & Branding) --- */}
        <div className="px-3 pb-5 border-t border-[#1E2D45] pt-3 mt-2 space-y-2">
          <button
            onClick={() => setIsSignOutOpen(true)}
            className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-md text-red-400 hover:bg-red-400/10 transition-colors duration-200"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>

          <div className="px-3 pt-1">
            <p className="text-[10px] text-slate-600 font-medium tracking-wide">CHATCO ADMIN v1.0</p>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-6 lg:p-8 text-white">
        {children}
      </main>

      {/* Desktop Sign Out Modal */}
      <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} onConfirm={onSignOut} />

      {/* Desktop Settings Drawer */}
      <SettingsDrawer />
    </div>
  );
}
