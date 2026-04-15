"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function CommuterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeDotIndex, setActiveDotIndex] = useState(
    navItems.findIndex((item) => item.href === pathname)
  );

  const handleNav = (href: string, index: number) => {
    setActiveDotIndex(index);
  };

  return (
    <div className="fixed inset-0 bg-[#050F1A] flex font-sans overflow-hidden">
      
      {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#071A2E] border-r border-white/10 z-50 flex-shrink-0">
        {/* Logo / Brand */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-[#1A5FB4] flex items-center justify-center text-white font-black shadow-lg shadow-[#1A5FB4]/30">
            C
          </div>
          <span className="ml-3 text-white font-extrabold text-lg tracking-tight">CHATCO</span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNav(item.href, index)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30" 
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">
              A
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Arone Dela Cruz</p>
              <p className="text-[10px] text-white/40">Commuter</p>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 relative overflow-hidden">
        {children}
        
        {/* --- MOBILE BOTTOM NAV (Hidden on Desktop) --- */}
        <nav className="absolute bottom-0 inset-x-0 z-50 bg-[#071A2E]/95 backdrop-blur-xl border-t border-white/10 lg:hidden">
          <div className="relative flex items-center justify-around h-20 px-2 max-w-lg mx-auto">
            
            <div 
              className="absolute top-2 w-1.5 h-1.5 rounded-full bg-[#62A0EA] transition-all duration-500 ease-in-out"
              style={{ left: `calc(${(activeDotIndex / (navItems.length - 1)) * 100}% - 4px)` }}
            />

            {navItems.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNav(item.href, index)}
                  className="flex flex-col items-center justify-center w-16 h-full relative group"
                >
                  <div 
                    className={`absolute top-1 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                      isActive 
                        ? "bg-[#1A5FB4] scale-100 shadow-lg shadow-[#1A5FB4]/40" 
                        : "bg-transparent scale-75 group-hover:scale-90"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-white" : "text-white/50 group-hover:text-white/80"}`} />
                  </div>
                  
                  <span className={`absolute bottom-2 text-[10px] font-medium transition-colors duration-300 ${isActive ? "text-[#62A0EA]" : "text-white/40"}`}>
                    {item.label}
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
const QrIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" /></svg>);
const GiftIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>);
const ShieldIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>);
const UserIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>);

const navItems = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/dashboard/ride-pay", label: "Ride & Pay", icon: QrIcon },
  { href: "/dashboard/rewards", label: "Rewards", icon: GiftIcon },
  { href: "/dashboard/safety", label: "Safety", icon: ShieldIcon },
  { href: "/dashboard/profile", label: "Profile", icon: UserIcon },
];