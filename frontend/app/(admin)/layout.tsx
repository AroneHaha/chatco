// app/(admin)/layout.tsx
'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Map, Package, BarChart3, Car, Sliders, Users } from 'lucide-react';
import { icon } from 'leaflet';

const navItems = [
  { href: '/admin-dashboard', label: 'Dashboard', icon: Home },
  { href: '/remittance', label: 'Remittance', icon: Receipt },
  { href: '/monitoring', label: 'Monitoring', icon: Map },
  { href: '/vehicles', label: 'Vehicles', icon: Car },
  { href: '/lost-found', label: 'Lost & Found', icon: Package },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  {href: '/settings', label: 'Settings', icon: Sliders},
   {href: '/users', label: 'User Management', icon: Users}
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  // Refs for the mobile bottom nav animation
  const indicatorRef = useRef<HTMLDivElement>(null);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's 'md' breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Mobile: Animate the bottom nav indicator
  useEffect(() => {
    if (!isMobile) return;
    const currentIndex = navItems.findIndex(item => item.href === pathname);
    if (currentIndex !== -1) {
      const activeItem = navItemRefs.current[currentIndex];
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
        {/* Side Navigation */}
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

        {/* Main Content */}
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
          {/* Animated Circle Indicator */}
          <div
            ref={indicatorRef}
            className="absolute top-1/2 -translate-y-1/2 h-12 bg-blue-500 rounded-full transition-all duration-300 ease-in-out shadow-lg"
          />
          {navItems.map((item, index) => {
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
        </div>
      </nav>
    </div>
  );
}