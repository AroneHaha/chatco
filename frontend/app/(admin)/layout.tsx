// app/(admin)/layout.tsx
'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Map, Package, BarChart3, Car } from 'lucide-react';

const navItems = [
  { href: '/admin-dashboard', label: 'Dashboard', icon: Home },
  { href: '/remittance', label: 'Remittance', icon: Receipt },
  { href: '/monitoring', label: 'Monitoring', icon: Map },
  { href: '/vehicles', label: 'Vehicles', icon: Car },
  { href: '/lost-found', label: 'Lost & Found', icon: Package },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const currentIndex = navItems.findIndex(item => item.href === pathname);
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    }
  }, [pathname]);

  useEffect(() => {
    const activeItem = navItemRefs.current[activeIndex];
    if (indicatorRef.current && activeItem) {
      const { offsetLeft, offsetWidth } = activeItem;
      indicatorRef.current.style.width = `${offsetWidth}px`;
      indicatorRef.current.style.left = `${offsetLeft}px`;
    }
  }, [activeIndex]);

  return (
    // FIX: Apply dark gradient background here
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col">
      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation - Updated for dark theme */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md border-t border-white/10 z-50">
        <div className="relative flex justify-around items-center h-16 max-w-screen-xl mx-auto">
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
                <span className="mt-1 hidden sm:block">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}