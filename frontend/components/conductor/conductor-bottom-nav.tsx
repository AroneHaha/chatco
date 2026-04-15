"use client";

import Link from "next/link";

// --- ICONS ---
const HomeIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>);
const UsersIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>);
const ReceiptIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>);
const MenuIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>);

const navItems = [
  { href: "/conductor-dashboard", label: "Home", icon: HomeIcon },
  { href: "/conductor-dashboard/passengers", label: "Passengers", icon: UsersIcon },
  { href: "/dashboard/expenses", label: "Expenses", icon: ReceiptIcon },
  { href: "/dashboard/menu", label: "Menu", icon: MenuIcon },
];

export default function ConductorBottomNav({ pathname }: { pathname: string }) {
  const activeIndex = navItems.findIndex((item) => item.href === pathname);

  return (
    <nav className="absolute bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-t border-blue-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="relative flex items-center justify-around h-20 px-2 max-w-lg mx-auto">
        
        {/* Sliding Active Dot */}
        <div 
          className="absolute top-2 w-1.5 h-1.5 rounded-full bg-[#1A5FB4] transition-all duration-500 ease-in-out"
          style={{ left: `calc(${(activeIndex / (navItems.length - 1)) * 100}% - 4px)` }}
        />

        {navItems.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-16 h-full relative group"
            >
              <div 
                className={`absolute top-1 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                  isActive 
                    ? "bg-[#1A5FB4] scale-100 shadow-lg shadow-blue-500/30" 
                    : "bg-transparent scale-75 group-hover:scale-90"
                }`}
              >
                <item.icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600"}`} />
              </div>
              
              <span className={`absolute bottom-2 text-[10px] font-medium transition-colors duration-300 ${isActive ? "text-[#1A5FB4]" : "text-gray-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

