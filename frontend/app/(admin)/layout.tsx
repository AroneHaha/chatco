// app/(admin)/layout.tsx
'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Map, Package, BarChart3, Car, Sliders, Users, Menu } from 'lucide-react';

// All items for Desktop
const navItems = [
  { href: '/admin-dashboard', label: 'Dashboard', icon: Home },
  { href: '/remittance', label: 'Remittance', icon: Receipt },
  { href: '/monitoring', label: 'Monitoring', icon: Map },
  { href: '/vehicles', label: 'Fleet Management', icon: Car },
  { href: '/lost-found', label: 'Lost & Found', icon: Package },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Sliders },
  { href: '/users', label: 'User Management', icon: Users }
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

  // --- DESKTOP SIDE NAVIGATION ---
  if (!isMobile) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <nav className="w-64 backdrop-blur-md bg-gray-900/95 border-r border-white/10 flex flex-col">
          <div className="p-6">
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
          </div>
          <div className="flex-1 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400 border-l-4 border-blue-500'
                      : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 text-white">
          {children}
        </main>
      </div>
    );
  }

  // --- MOBILE BOTTOM NAVIGATION ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col">
      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md border-t border-white/10 z-50 md:hidden">
        <div className="relative flex justify-around items-center h-16 max-w-screen-xl mx-auto">
          {/* Animated Pill Indicator */}
          <div
            ref={indicatorRef}
            className="absolute top-1/2 -translate-y-1/2 h-12 bg-blue-500 rounded-full transition-all duration-300 ease-in-out shadow-lg"
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
                  isActive ? 'text-white' : 'text-gray-400'
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
              isMoreOpen || mobileMoreItems.some(i => i.href === pathname) ? 'text-white' : 'text-gray-400'
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
            <div className="absolute bottom-20 right-4 left-4 bg-gray-800 border border-white/10 rounded-2xl p-4 shadow-2xl z-50">
              <div className="grid grid-cols-2 gap-3">
                {mobileMoreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMoreOpen(false)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl transition-colors ${
                        isActive 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <Icon size={22} />
                      <span className="mt-2 text-xs text-center leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </nav>
    </div>
  );
}