"use client";

import Link from "next/link";

const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);
const ReportIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);
const QrIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
  </svg>
);
const ScanIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m15 10.5 4.5 4.5m0 0 4.5-4.5" />
  </svg>
);
const ChartIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);
const SettingsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const regularNavItems = [
  { href: "/conductor-dashboard", label: "Home", icon: HomeIcon },
  { href: "/conductor-dashboard/end-of-day", label: "Report", icon: ReportIcon },
  { href: "/conductor-dashboard/metrics", label: "Metrics", icon: ChartIcon },
  { href: "/conductor-dashboard/settings", label: "Settings", icon: SettingsIcon },
];

export default function ConductorBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="absolute bottom-0 inset-x-0 z-50 pb-safe">
      <div className="bg-[#0B1E33]/90 backdrop-blur-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.3)] border-t border-white/[0.06]">
        <div className="relative flex items-end justify-around px-4 pt-1 pb-1 md:pt-1.5 md:pb-1.5">

          {/* Left pair */}
          {regularNavItems.slice(0, 2).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center w-[72px] py-1 relative group"
              >
                <div className={`relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-2xl transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-[#1A5FB4] shadow-lg shadow-[#1A5FB4]/25"
                    : "hover:bg-white/[0.06]"
                }`}>
                  <item.icon className={`w-[17px] h-[17px] md:w-[18px] md:h-[18px] transition-colors duration-300 ${isActive ? "text-white" : "text-white/40 group-hover:text-white/70"}`} />
                </div>
                <span className={`text-[10px] font-medium mt-0.5 md:mt-1 transition-colors duration-300 leading-none ${
                  isActive ? "text-white" : "text-white/30 group-hover:text-white/50"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Center Scan */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("conductor:scan-qr"))}
            className="flex flex-col items-center justify-center relative -mt-[50px] mb-0.5 md:mb-1 group"
          >
            <div className="w-[52px] h-[52px] md:w-[56px] md:h-[56px] rounded-full bg-[#1A5FB4] flex items-center justify-center shadow-lg shadow-[#1A5FB4]/30 hover:bg-[#165a9f] active:scale-[0.92] transition-all duration-200 ring-4 ring-[#0B1E33]/80">
              <QrIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-[9px] font-semibold text-white/50 mt-0.5 md:mt-1 group-hover:text-white/70 transition-colors leading-none">
              Scan
            </span>
          </button>

          {/* Right pair */}
          {regularNavItems.slice(2, 4).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center w-[72px] py-1 relative group"
              >
                <div className={`relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-2xl transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-[#1A5FB4] shadow-lg shadow-[#1A5FB4]/25"
                    : "hover:bg-white/[0.06]"
                }`}>
                  <item.icon className={`w-[17px] h-[17px] md:w-[18px] md:h-[18px] transition-colors duration-300 ${isActive ? "text-white" : "text-white/40 group-hover:text-white/70"}`} />
                </div>
                <span className={`text-[10px] font-medium mt-0.5 md:mt-1 transition-colors duration-300 leading-none ${
                  isActive ? "text-white" : "text-white/30 group-hover:text-white/50"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

        </div>
      </div>
    </nav>
  );
}