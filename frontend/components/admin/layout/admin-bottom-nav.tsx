'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import {
  mobileMainItems,
  mobileOverflowItems,
  mobileMoreItems,
} from '@/config/admin-nav';
import { useSettingsDrawer } from '@/components/admin/ui/settings-drawer';
import { AdminIdentity } from '@/components/admin/layout/admin-identity';
import { AdminThemeToggle } from '@/components/admin/layout/admin-theme-toggle';
import { useAdminTheme } from '@/contexts/admin-theme-context';
import { useAdminNotifications, formatAdminBadgeCount } from '@/contexts/admin-notifications-context';

interface AdminBottomNavProps {
  isMoreOpen: boolean;
  setIsMoreOpen: (open: boolean) => void;
  onSignOut: () => void;
}

export function AdminBottomNav({ isMoreOpen, setIsMoreOpen, onSignOut }: AdminBottomNavProps) {
  const pathname = usePathname();
  const [theme] = useAdminTheme();
  const { openSettingsDrawer } = useSettingsDrawer();
  const { remittance, monitoring, discountApplications } = useAdminNotifications();
  const moduleBadgeCounts: Record<string, number> = {
    '/remittance': remittance.count,
    '/monitoring': monitoring.count,
    '/users': discountApplications.count,
  };

  // Badges on items inside the More sheet roll up onto the More button, so a
  // pending count is visible without opening the sheet.
  const moreBadgeCount = mobileMoreItems.reduce((sum, item) => sum + (moduleBadgeCounts[item.href] ?? 0), 0);

  const indicatorRef = useRef<HTMLDivElement>(null);
  const navItemRefs = useRef<(HTMLElement | null)[]>([]);

  // Animate the bottom nav indicator
  useEffect(() => {
    const mainIndex = mobileMainItems.findIndex(item => item.href === pathname);
    let activeIndex = mainIndex;

    if (mainIndex === -1) {
      activeIndex = 4;
    }

    if (activeIndex !== -1) {
      const activeItem = navItemRefs.current[activeIndex];
      if (indicatorRef.current && activeItem) {
        const { offsetLeft, offsetWidth } = activeItem;
        indicatorRef.current.style.width = `${offsetWidth}px`;
        indicatorRef.current.style.left = `${offsetLeft}px`;
      }
    }
  }, [pathname]);

  return (
    <nav data-admin-theme={theme} className="fixed bottom-0 left-0 right-0 bg-[#0D1424]/95 admin-light:bg-white/95 backdrop-blur-sm border-t border-[#1E2D45] admin-light:border-[#E2E8F0] z-50 md:hidden">
      <div className="relative flex justify-around items-center h-16 max-w-screen-xl mx-auto">
        {/* Thin top-line indicator */}
        <div
          ref={indicatorRef}
          className="absolute top-0 h-0.5 bg-[#62A0EA] admin-light:bg-[#1A5FB4] transition-all duration-300 ease-in-out"
        />

        {/* Main 4 Items */}
        {mobileMainItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const badgeCount = moduleBadgeCounts[item.href] ?? 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={el => { navItemRefs.current[index] = el; }}
              className={`relative z-10 flex flex-col items-center justify-center min-w-0 w-full h-full text-[10px] font-medium transition-colors duration-200 ${
                isActive ? 'text-[#62A0EA] admin-light:text-[#1A5FB4]' : 'text-slate-500'
              }`}
            >
              <span className="relative inline-flex shrink-0">
                <Icon size={20} />
                {badgeCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-[#FF6D3A] rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-[#0D1424] admin-light:ring-white tabular-nums"
                  >
                    {formatAdminBadgeCount(badgeCount)}
                  </span>
                )}
              </span>
              <span className="mt-1 max-w-full truncate px-0.5">{item.label}</span>
            </Link>
          );
        })}

        {/* "More" Button */}
        <button
          ref={el => { navItemRefs.current[4] = el; }}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`relative z-10 flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors duration-200 ${
            isMoreOpen || mobileMoreItems.some(i => i.href === pathname) ? 'text-[#62A0EA] admin-light:text-[#1A5FB4]' : 'text-slate-500'
          }`}
        >
          <span className="relative inline-flex shrink-0">
            <Menu size={20} />
            {moreBadgeCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-[#FF6D3A] rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-[#0D1424] admin-light:ring-white tabular-nums"
              >
                {formatAdminBadgeCount(moreBadgeCount)}
              </span>
            )}
          </span>
          <span className="mt-1">More</span>
          {moreBadgeCount > 0 && <span className="sr-only">, {moreBadgeCount} items need attention</span>}
        </button>
      </div>

      {/* "More" Menu Popup */}
      {isMoreOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="absolute bottom-20 right-4 left-4 bg-[#1A2540] admin-light:bg-white border border-[#2A3A55] admin-light:border-[#E2E8F0] rounded-lg p-4 shadow-2xl z-50">
            <div className="-mx-1 mb-3 pb-3 border-b border-[#2A3A55] admin-light:border-[#E2E8F0]">
              <div className="flex items-center justify-between gap-2 pr-1">
                <AdminIdentity />
                <AdminThemeToggle />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {mobileOverflowItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex flex-col items-center justify-center p-3 rounded-md transition-colors ${
                      isActive
                        ? 'bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 text-[#62A0EA] admin-light:text-[#1A5FB4]'
                        : 'text-slate-300 admin-light:text-slate-700 hover:bg-[#131C2E] admin-light:hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="mt-2 text-xs text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}

              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                const isSettings = item.href === '/settings';
                const isActive = isSettings ? pathname.startsWith('/settings') : pathname === item.href;
                const badgeCount = moduleBadgeCounts[item.href] ?? 0;

                if (isSettings) {
                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        setIsMoreOpen(false);
                        openSettingsDrawer();
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-md transition-colors w-full ${
                        isActive
                          ? 'bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 text-[#62A0EA] admin-light:text-[#1A5FB4]'
                          : 'text-slate-300 admin-light:text-slate-700 hover:bg-[#131C2E] admin-light:hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <Icon size={22} />
                      <span className="mt-2 text-xs text-center leading-tight">{item.label}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={`flex flex-col items-center justify-center p-3 rounded-md transition-colors ${
                      isActive
                        ? 'bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 text-[#62A0EA] admin-light:text-[#1A5FB4]'
                        : 'text-slate-300 admin-light:text-slate-700 hover:bg-[#131C2E] admin-light:hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <span className="relative inline-flex">
                      <Icon size={22} />
                      {badgeCount > 0 && <span aria-label={`${badgeCount} pending discount applications`} className="absolute -top-2 -right-2 min-w-4 h-4 px-1 bg-[#FF6D3A] rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-[#1A2540] admin-light:ring-white tabular-nums">{formatAdminBadgeCount(badgeCount)}</span>}
                    </span>
                    <span className="mt-2 text-xs text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}

              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  onSignOut();
                }}
                className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-md text-red-400 admin-light:text-red-600 hover:bg-red-400/10 admin-light:hover:bg-red-50 transition-colors border border-red-400/20 admin-light:border-red-200"
              >
                <LogOut size={20} />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
