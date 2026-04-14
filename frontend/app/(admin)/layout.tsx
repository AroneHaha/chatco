// app/admin/layout.tsx
'use client'; 

import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Map, Package, BarChart3 } from 'lucide-react';

// Define the navigation items
const navItems = [
  { href: '/admin-dashboard', label: 'Dashboard', icon: Home },
  { href: '/remittance', label: 'Remittance', icon: Receipt },
  { href: '/monitoring', label: 'Monitoring', icon: Map },
  { href: '/lost-found', label: 'Lost & Found', icon: Package },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Update active index and move indicator on path change
  useEffect(() => {
    const currentIndex = navItems.findIndex(item => item.href === pathname);
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex);
    }
  }, [pathname]);

  // Animate the indicator
  useEffect(() => {
    const activeItem = navItemRefs.current[activeIndex];
    if (indicatorRef.current && activeItem) {
      const { offsetLeft, offsetWidth } = activeItem;
      indicatorRef.current.style.width = `${offsetWidth}px`;
      indicatorRef.current.style.left = `${offsetLeft}px`;
    }
  }, [activeIndex]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="relative flex justify-around items-center h-16 max-w-screen-xl mx-auto">
          {/* Animated Circle Indicator */}
          <div
            ref={indicatorRef}
            className="absolute top-1/2 -translate-y-1/2 h-12 bg-blue-500 rounded-full transition-all duration-300 ease-in-out shadow-lg"
          />
          
          {/* Nav Items */}
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={el => { navItemRefs.current[index] = el; }}
                className={`relative z-10 flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-gray-500'
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