// app/(commuter)/layout.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { AnnouncementsProvider, useAnnouncements } from "@/contexts/announcements-context";
import { RewardsProvider, useRewardsData } from "@/contexts/rewards-context";
import MaintenanceGate from "@/components/shared/maintenance-gate";
import { getCommuterTypeLabel } from "@/types";
import { QrScanner } from "@/components/commuter/feedback/qr-scanner";

/**
 * Spell out what the Rewards badge is counting for screen readers — the number
 * alone is ambiguous when it merges two different things.
 */
function rewardsBadgeLabel(unread: number, vouchers: number): string {
  const parts: string[] = [];
  if (unread > 0) parts.push(`${unread} unread update${unread === 1 ? "" : "s"}`);
  if (vouchers > 0) parts.push(`${vouchers} voucher${vouchers === 1 ? "" : "s"} ready to redeem`);
  return parts.join(", ");
}

function CommuterLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { commuterProfile, isLoading: authLoading } = useAuth();
  // The Feedback tab opens the QR scanner as an overlay instead of routing to
  // /feedback directly — scanning/manual entry doesn't need a full page, and
  // this way it can be launched from wherever the commuter already is. Once a
  // token is captured, it still routes to /feedback (unchanged) for the
  // verify/resolve step and the driver+conductor rating form.
  const [showFeedbackScan, setShowFeedbackScan] = useState(false);
  const handleFeedbackToken = (token: string) => {
    setShowFeedbackScan(false);
    router.push(`/feedback?token=${encodeURIComponent(token)}`);
  };
  // The Rewards tab covers both announcements and vouchers, so its badge is
  // the sum of the two things worth opening it for: updates you haven't read,
  // and free-ride vouchers you can redeem right now (one per 10 cashless
  // rides, and the cycle repeats — several can be waiting at once).
  // Both come from providers shared with the rewards page, so acting on either
  // there decrements this badge immediately. 0 renders no badge at all.
  const { unreadCount } = useAnnouncements();
  const { availableVoucherCount } = useRewardsData();
  const rewardsBadge = unreadCount + availableVoucherCount;

  const [activeDotIndex, setActiveDotIndex] = useState(
    navItems.findIndex((item) => item.href === pathname)
  );

  const handleNav = (href: string, index: number) => {
    setActiveDotIndex(index);
  };

  const navItemsWithBadges = navItems.map(item => {
    if (item.href === "/rewards") {
      return { ...item, badge: rewardsBadge, badgeLabel: rewardsBadgeLabel(unreadCount, availableVoucherCount) };
    }
    return { ...item, badge: 0, badgeLabel: "" };
  });

  // Derive user info from auth context
  const userInitial = commuterProfile?.firstName?.[0] ?? "?";
  const userName = commuterProfile
    ? `${commuterProfile.firstName} ${commuterProfile.surname}`
    : authLoading ? "Loading..." : "Guest";
  const userTypeLabel = commuterProfile
    ? getCommuterTypeLabel(commuterProfile.commuterType)
    : "";

  return (
    <div className="fixed inset-0 bg-[#050F1A] flex font-sans overflow-hidden">

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-[#071A2E] border-r border-white/10 z-50 flex-shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <img src="/logo-transparent.png" alt="CHATCO" className="w-10 h-10 rounded-xl object-contain" />
          <span className="ml-3 text-white font-extrabold text-lg tracking-tight">CHATCO</span>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1">
          {navItemsWithBadges.map((item, index) => {
            const isActive = pathname === item.href;
            const isFeedback = item.href === "/feedback";
            const className = `relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-w-0 ${
              isActive ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30" : "text-white/50 hover:text-white hover:bg-white/5"
            }`;
            const label = item.badge > 0 ? `${item.label} — ${item.badgeLabel}` : undefined;
            const content = (
              <>
                <div className="relative flex-shrink-0">
                  <item.icon className="w-5 h-5" />
                  {item.badge > 0 && (
                     <span
                       aria-hidden="true"
                       className="absolute -top-2 -right-2 min-w-4 h-4 px-1 bg-[#FF6D3A] rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-[#071A2E] tabular-nums"
                     >
                       {item.badge > 99 ? "99+" : item.badge}
                     </span>
                  )}
                </div>
                <span className="truncate">{item.label}</span>
              </>
            );
            return isFeedback ? (
              <button
                key={item.href}
                type="button"
                onClick={() => setShowFeedbackScan(true)}
                aria-label={label}
                className={className}
              >
                {content}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNav(item.href, index)}
                aria-label={label}
                className={className}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold text-sm border-2 border-white/20">{userInitial}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{userName}</p>
              <p className="text-[10px] text-white/40">{userTypeLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 relative overflow-hidden">
        {children}

        {/* --- MOBILE BOTTOM NAV --- */}
        {/* Chrome matches components/conductor/conductor-bottom-nav.tsx so both
            roles read as the same app: same surface, blur, lift shadow and
            rounded-2xl icon chips. */}
        <nav className="absolute bottom-0 inset-x-0 z-50 lg:hidden pb-safe">
          <div className="bg-[#0B1E33]/90 backdrop-blur-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.3)] border-t border-white/[0.06]">
            <div className="relative grid grid-cols-5 max-w-lg mx-auto pt-1 pb-1 md:pt-1.5 md:pb-1.5">
              <div
                className="absolute top-1.5 w-1.5 h-1.5 rounded-full bg-[#62A0EA] transition-all duration-300 ease-in-out"
                style={{ left: `calc(${activeDotIndex * (100/5) + (100/10)}% - 3px)` }}
              />

              {navItemsWithBadges.map((item, index) => {
                const isActive = pathname === item.href;
                const isFeedback = item.href === "/feedback";
                const label = item.badge > 0 ? `${item.label} — ${item.badgeLabel}` : undefined;
                const content = (
                  <>
                    <div
                      className={`relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-2xl transition-all duration-300 ease-out ${
                        isActive
                          ? "bg-[#1A5FB4] shadow-lg shadow-[#1A5FB4]/25"
                          : "hover:bg-white/[0.06]"
                      }`}
                    >
                      <item.icon className={`w-[17px] h-[17px] md:w-[18px] md:h-[18px] transition-colors duration-300 ${isActive ? "text-white" : "text-white/40 group-hover:text-white/70"}`} />

                      {item.badge > 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#FF6D3A] rounded-full text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-[#0B1E33] tabular-nums"
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </div>

                    <span className={`text-[10px] font-medium mt-0.5 md:mt-1 transition-colors duration-300 leading-none truncate max-w-[64px] text-center ${
                      isActive ? "text-white" : "text-white/30 group-hover:text-white/50"
                    }`}>
                      {item.shortLabel || item.label}
                    </span>
                  </>
                );
                return isFeedback ? (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => setShowFeedbackScan(true)}
                    aria-label={label}
                    className="flex flex-col items-center justify-center py-1 relative group"
                  >
                    {content}
                  </button>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => handleNav(item.href, index)}
                    aria-label={label}
                    className="flex flex-col items-center justify-center py-1 relative group"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </main>

      {/* --- FEEDBACK QR SCAN MODAL --- */}
      {/* No backdrop-click-to-close — a live camera stream is running, same
          convention as the GCash scan modal. */}
      {showFeedbackScan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm max-h-[88vh] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <QrScanner variant="modal" onToken={handleFeedbackToken} onCancel={() => setShowFeedbackScan(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap with AuthProvider so all commuter pages have access to auth context.
// The announcement and rewards providers sit inside it (both read auth to
// decide whether to fetch) and outside the layout body, so the tab badge and
// the rewards page share one copy of the feed and one copy of the vouchers.
export default function CommuterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AnnouncementsProvider>
        <RewardsProvider>
          <MaintenanceGate>
            <CommuterLayoutInner>{children}</CommuterLayoutInner>
          </MaintenanceGate>
        </RewardsProvider>
      </AnnouncementsProvider>
    </AuthProvider>
  );
}

// --- ICONS ---
const HomeIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>);
const LostFoundIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>);
const GiftIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>);
const BellIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>);
const UserIcon = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>);

// Navigation items — 5 tabs
const navItems = [
  { href: "/dashboard", label: "Home", shortLabel: "Home", icon: HomeIcon },
  { href: "/lost-and-found", label: "Lost & Found", shortLabel: "Lost & Found", icon: LostFoundIcon },
  { href: "/rewards", label: "Rewards & Announcements", shortLabel: "Rewards", icon: GiftIcon },
  { href: "/feedback", label: "Feedback", shortLabel: "Feedback", icon: BellIcon },
  { href: "/profile", label: "Profile", shortLabel: "Profile", icon: UserIcon },
];
