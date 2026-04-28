// app/(commuter)/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

// --- MOCK BADGE FETCH (Backend Proof) ---
const fetchBadgeCounts = () => {
  return {
    rewards: 2,    // e.g., 2 available vouchers + unread announcements
  };
};

export default function CommuterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeDotIndex, setActiveDotIndex] = useState(
    navItems.findIndex((item) => item.href === pathname)
  );
  const [badges, setBadges] = useState({ rewards: 0 });

  useEffect(() => {
    setBadges(fetchBadgeCounts());
  }, []);

  const handleNav = (href: string, index: number) => {
    setActiveDotIndex(index);
  };

  const navItemsWithBadges = navItems.map(item => {
    if (item.href === "/rewards") return { ...item, badge: badges.rewards };
    return { ...item, badge: 0 };
  });

  return (
    <div className="fixed inset-0 bg-[#050F1A] flex font-sans overflow-hidden">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#071A2E] border-r border-white/10 z-50 flex-shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-[#1A5FB4] flex items-center justify-center text-white font-black shadow-lg shadow-[#1A5FB4]/30">C</div>
          <span className="ml-3 text-white font-extrabold text-lg tracking-tight">CHATCO</span>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItemsWithBadges.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNav(item.href, index)}
                // Added min-w-0 to allow text truncation safely
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-w-0 ${
                  isActive ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className="w-5 h-5" />
                  {item.badge > 0 && (
                     <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#FF6D3A] rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-[#071A2E]">
                       {item.badge}
                     </span>
                  )}
                </div>
                {/* Added truncate for safety on smaller desktop screens */}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">A</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">Arone Dela Cruz</p>
              <p className="text-[10px] text-white/40">Commuter</p>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 relative overflow-hidden">
        {children}
        
        {/* --- MOBILE BOTTOM NAV --- */}
        <nav className="absolute bottom-0 inset-x-0 z-50 bg-[#071A2E]/95 backdrop-blur-xl border-t border-white/10 lg:hidden">
          <div className="relative flex items-center justify-around h-20 px-2 max-w-lg mx-auto">
            
            <div 
              className="absolute top-2 w-1.5 h-1.5 rounded-full bg-[#62A0EA] transition-all duration-500 ease-in-out"
              style={{ left: `calc(${(activeDotIndex / (navItemsWithBadges.length - 1)) * 100}% - 4px)` }}
            />

            {navItemsWithBadges.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNav(item.href, index)}
                  className="flex flex-col items-center justify-center w-16 h-full relative group"
                >
                  <div 
                    className={`relative top-1 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                      isActive ? "bg-[#1A5FB4] scale-100 shadow-lg shadow-[#1A5FB4]/40" : "bg-transparent scale-75 group-hover:scale-90"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-white" : "text-white/50 group-hover:text-white/80"}`} />
                    
                    {item.badge > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-[#FF6D3A] rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-[#071A2E]/95">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  
                  {/* Uses shortLabel for mobile to prevent ugly text wrapping/overflow */}
                  <span className={`absolute bottom-2 text-[10px] font-medium transition-colors duration-300 truncate w-full text-center px-1 ${isActive ? "text-[#62A0EA]" : "text-white/40"}`}>
                    {item.shortLabel || item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}

// --- ICONS ---
const HomeIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>);
const LostFoundIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>);
const GiftIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>);
const BellIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>);
const UserIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>);

// Added shortLabel property for the mobile bottom nav
const navItems = [
  { href: "/dashboard", label: "Home", shortLabel: "Home", icon: HomeIcon },  
  { href: "/lost-and-found", label: "Lost & Found", shortLabel: "Lost", icon: LostFoundIcon },
  { href: "/rewards", label: "Rewards & Announcements", shortLabel: "Rewards", icon: GiftIcon },
  { href: "/feedback", label: "Feedback", shortLabel: "Feedback", icon: BellIcon },
  { href: "/profile", label: "Profile", shortLabel: "Profile", icon: UserIcon },
];