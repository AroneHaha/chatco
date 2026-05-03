// app/(admin)/layout.tsx
'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Home, Receipt, Map, Package, BarChart3, Car, Sliders, Users, Menu, LogOut, X, Bus, Settings, Shield, Eye } from 'lucide-react';
import { SignOutModal } from '@/components/admin/ui/sign-out-modal';

// ─── Nav Sections ───

const operationsNav = [
  { href: '/admin-dashboard', label: 'Dashboard', icon: Home },
  { href: '/remittance', label: 'Remittance', icon: Receipt },
  { href: '/monitoring', label: 'Monitoring', icon: Map },
];

const managementNav = [
  { href: '/vehicles', label: 'Fleet Management', icon: Car },
  { href: '/lost-found', label: 'Lost & Found', icon: Package },
  { href: '/users', label: 'User Management', icon: Users },
];

const systemNav = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Sliders },
];

// Items for Mobile Bottom Bar (Shortened labels to prevent overlap)
const mobileMainItems = [
  { href: '/admin-dashboard', label: 'Home', icon: Home },
  { href: '/remittance', label: 'Remit', icon: Receipt },
  { href: '/monitoring', label: 'Map', icon: Map },
  { href: '/analytics', label: 'Stats', icon: BarChart3 },
];

// Items hidden inside the "More" menu on Mobile
const mobileMoreItems = [
  { href: '/vehicles', label: 'Fleet Management', icon: Car },
  { href: '/lost-found', label: 'Lost & Found', icon: Package },
  { href: '/users', label: 'User Management', icon: Users },
  { href: '/settings', label: 'Settings', icon: Sliders },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false); // New State

  // Refs for the mobile bottom nav animation (HTMLElement allows both <a> and <button>)
  const indicatorRef = useRef<HTMLDivElement>(null);
  const navItemRefs = useRef<(HTMLElement | null)[]>([]);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close "More" menu when route changes
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Mobile: Animate the bottom nav indicator (Only for the 4 main items + 1 More button)
  useEffect(() => {
    if (!isMobile) return;

    // Check if current route is in the main 4 items
    const mainIndex = mobileMainItems.findIndex(item => item.href === pathname);
    let activeIndex = mainIndex;

    // If it's not in the main 4, it must be in the "More" menu, so highlight the "More" button (index 4)
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
  }, [pathname, isMobile]);

  // Sign Out Handler
  const handleSignOut = () => {
    console.log("User signed out");
    setIsSignOutOpen(false);
    window.location.href = '/login';
  };

  // --- DESKTOP SIDE NAVIGATION ---
  if (!isMobile) {
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

          </div>

          {/* --- NEW: Bottom Section (Sign Out & Branding) --- */}
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

        {/* --- Desktop Sign Out Modal --- */}
        <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} onConfirm={handleSignOut} />
      </div>
    );
  }

  // --- MOBILE BOTTOM NAVIGATION ---
  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex flex-col">
      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
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
                className={`relative z-10 flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors duration-200 ${
                  isActive ? 'text-[#62A0EA]' : 'text-slate-500'
                }`}
              >
                <Icon size={20} />
                <span className="mt-1">{item.label}</span>
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
            {/* Invisible backdrop to close menu when tapping outside */}
            <div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setIsMoreOpen(false)}
            />

            {/* Actual Menu */}
            <div className="absolute bottom-20 right-4 left-4 bg-[#1A2540] border border-[#2A3A55] rounded-lg p-4 shadow-2xl z-50">
              <div className="grid grid-cols-2 gap-3">
                {mobileMoreItems.map((item) => {
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

                {/* --- NEW: Mobile Sign Out Button --- */}
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    setIsSignOutOpen(true);
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

      {/* --- Mobile Sign Out Modal --- */}
      <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} onConfirm={handleSignOut} />
    </div>
  );
}