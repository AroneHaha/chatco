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

interface AdminBottomNavProps {
  isMoreOpen: boolean;
  setIsMoreOpen: (open: boolean) => void;
  onSignOut: () => void;
}

export function AdminBottomNav({ isMoreOpen, setIsMoreOpen, onSignOut }: AdminBottomNavProps) {
  const pathname = usePathname();
  const { openSettingsDrawer } = useSettingsDrawer();

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
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0D1424]/95 backdrop-blur-sm border-t border-[#1E2D45] z-50 md:hidden">
      <div className="relative flex justify-around items-center h-16 max-w-screen-xl mx-auto">
        {/* Thin top-line indicator */}
        <div
          ref={indicatorRef}
          className="absolute top-0 h-0.5 bg-[#62A0EA] transition-all duration-300 ease-in-out"
        />

        {/* Main 4 Items */}
        {mobileMainItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={el => { navItemRefs.current[index] = el; }}
              className={`relative z-10 flex flex-col items-center justify-center min-w-0 w-full h-full text-[10px] font-medium transition-colors duration-200 ${
                isActive ? 'text-[#62A0EA]' : 'text-slate-500'
              }`}
            >
              <Icon size={20} />
              <span className="mt-1 max-w-full truncate px-0.5">{item.label}</span>
            </Link>
          );
        })}

        {/* "More" Button */}
        <button
          ref={el => { navItemRefs.current[4] = el; }}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`relative z-10 flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors duration-200 ${
            isMoreOpen || mobileMoreItems.some(i => i.href === pathname) ? 'text-[#62A0EA]' : 'text-slate-500'
          }`}
        >
          <Menu size={20} />
          <span className="mt-1">More</span>
        </button>
      </div>

      {/* "More" Menu Popup */}
      {isMoreOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="absolute bottom-20 right-4 left-4 bg-[#1A2540] border border-[#2A3A55] rounded-lg p-4 shadow-2xl z-50">
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
                        ? 'bg-[#62A0EA]/10 text-[#62A0EA]'
                        : 'text-slate-300 hover:bg-[#131C2E]'
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
                          ? 'bg-[#62A0EA]/10 text-[#62A0EA]'
                          : 'text-slate-300 hover:bg-[#131C2E]'
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
                        ? 'bg-[#62A0EA]/10 text-[#62A0EA]'
                        : 'text-slate-300 hover:bg-[#131C2E]'
                    }`}
                  >
                    <Icon size={22} />
                    <span className="mt-2 text-xs text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}

              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  onSignOut();
                }}
                className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-md text-red-400 hover:bg-red-400/10 transition-colors border border-red-400/20"
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
