"use client";

import Link from "next/link";

const navItems = [
  { href: "/conductor-dashboard", label: "Dashboard", icon: "M2.25 12l8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" },
  { href: "/conductor-dashboard/passengers", label: "Passengers", icon: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" },
  { href: "/dashboard/expenses", label: "Expenses", icon: "M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" },
  { href: "/dashboard/menu", label: "End of Day", icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" },
];

export default function ConductorSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="w-64 bg-[#050F1A] flex flex-col border-r border-white/10">
      {/* Logo / Header */}
      <div className="h-20 flex items-center px-6 border-b border-white/10">
        <h1 className="text-white font-bold text-xl tracking-tight">CHATCO<span className="text-[#62A0EA]">.</span></h1>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30" 
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold">
            M
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Mark Conductor</p>
            <p className="text-white/40 text-xs">Shift Active</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

