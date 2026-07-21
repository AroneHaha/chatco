// app/(commuter)/rewards/page.tsx
"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRewards } from "./use-rewards";
import { useAnnouncements } from "@/contexts/announcements-context";
import { Voucher, AnnouncementType, Announcement } from "./types";

// Camera-dependent, so it stays out of the initial bundle and off the server.
const ReceiptScanModal = dynamic(
  () => import("@/components/commuter/modals/receipt-scan-modal"),
  { ssr: false }
);

// Each category gets a catchy emoji + colour so announcements pop in the feed.
const announcementConfig: Record<AnnouncementType, { color: string; bg: string; label: string; emoji: string }> = {
  PROMO: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Promo", emoji: "🎉" },
  SAFETY: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Safety", emoji: "🛡️" },
  SYSTEM: { color: "text-[#62A0EA]", bg: "bg-[#1A5FB4]/10 border-[#1A5FB4]/20", label: "System", emoji: "🔔" },
  MAINTENANCE: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Advisory", emoji: "🚧" },
};

function formatRelativeTime(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function RewardsPage() {
  const {
    data, isLoading: rewardsLoading, progressPercent, ridesRemaining,
    showVoucherModal, setShowVoucherModal, activeVoucher, redeemVoucher, refetch
  } = useRewards();

  // Paper cash receipt scanner (binds a cash ride to this account).
  const [showReceiptScan, setShowReceiptScan] = useState(false);

  // "How rewards work" explainer, opened from the ? on the progress card.
  const [showRewardsHelp, setShowRewardsHelp] = useState(false);

  // Stable identity: an inline arrow here would be a new function on every
  // render, which the scan modal would otherwise see as a changed prop.
  const handleReceiptClaimed = useCallback(() => {
    void refetch();
  }, [refetch]);

  const {
    announcements, isLoading: announcementsLoading, markAsRead, markAllAsRead, unreadCount
  } = useAnnouncements();

  // The announcement currently expanded in the overlay modal (null = closed).
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Open the full-detail modal + mark the item as read in one tap.
  const openAnnouncement = (item: Announcement) => {
    markAsRead(item.id);
    setSelectedAnnouncement(item);
  };

  if (rewardsLoading || announcementsLoading || !data) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#050F1A]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#62A0EA] rounded-full animate-spin" />
      </div>
    );
  }

  const getStatusColor = (status: Voucher["status"]) => {
    switch (status) {
      case "AVAILABLE": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      case "ACTIVE": return "border-amber-500/30 bg-amber-500/10 text-amber-400";
      case "USED": return "border-white/10 bg-white/5 text-white/30";
      case "EXPIRED": return "border-red-500/30 bg-red-500/10 text-red-400";
      default: return "";
    }
  };

  return (
    // Pinned header + independently scrolling body, matching the shell used by
    // lost-and-found: the page owns the viewport height and only the section
    // list below scrolls, so the title and the receipt-scan action stay
    // reachable no matter how far down the voucher list the user is.
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#050F1A]">

      {/* --- HEADER (fixed) --- */}
      <div className="flex-shrink-0 border-b border-white/10 bg-[#071A2E] z-10">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4 p-4 lg:px-8 lg:py-6">
          <div className="min-w-0">
            <h1 className="text-white font-bold text-xl lg:text-2xl">Rewards & Updates</h1>
            <p className="text-white/40 text-xs mt-1">Your perks, progress, and latest alerts.</p>
          </div>
          {/* Paid in cash? Scan the QR on the paper receipt to count that ride.
              Sits on the header surface now, so it takes the darker page fill
              to stay visible against it. */}
          <button
            onClick={() => setShowReceiptScan(true)}
            title="Scan receipt QR"
            className="w-11 h-11 rounded-xl bg-[#050F1A] hover:bg-[#0B1E33] border border-white/10 flex items-center justify-center flex-shrink-0 transition-colors group"
          >
            <svg className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* --- SCROLLING BODY --- */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 pb-28 lg:p-8 lg:pb-8 space-y-8">

        {/* --- 1. ANNOUNCEMENTS SECTION --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">Latest Updates</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-semibold text-[#62A0EA] hover:text-white transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="space-y-3">
            {announcements.slice(0, 3).map((item) => {
              const config = announcementConfig[item.type];
              return (
                <div
                  key={item.id}
                  onClick={() => openAnnouncement(item)}
                  className={`relative bg-[#071A2E] border rounded-xl p-4 transition-all duration-300 cursor-pointer hover:bg-[#0B1E33] ${item.isRead ? 'border-white/5 opacity-60' : 'border-white/10 shadow-lg shadow-black/20'}`}
                >
                  {!item.isRead && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#62A0EA]" />
                  )}
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${config.bg} ${config.color}`}>
                      <span className="text-[11px] leading-none">{config.emoji}</span>
                      {config.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-bold ${item.isRead ? 'text-white/60' : 'text-white'}`}>{item.title}</h4>
                      <p className="text-xs text-white/40 leading-relaxed mt-0.5 line-clamp-2">{item.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- 2. PROGRESS RING SECTION --- */}
        {/* `relative` anchors the help button; `pt-12 md:pt-8` keeps the ring
            clear of it on mobile, where the card stacks vertically. */}
        <div className="relative bg-[#071A2E] border border-white/10 rounded-2xl p-8 pt-12 md:pt-8 flex flex-col md:flex-row items-center gap-8 shadow-xl shadow-black/20">
          {/* How the reward cycle works — the rules (which payments count, how
              cash rides get credited, when vouchers expire) aren't guessable
              from the ring alone, and the receipt-scan button that credits a
              cash ride is easy to miss entirely. */}
          <button
            type="button"
            onClick={() => setShowRewardsHelp(true)}
            aria-label="How rewards work"
            className="absolute top-4 left-4 w-7 h-7 rounded-full bg-[#050F1A] border border-white/10 text-white/40 hover:text-white hover:border-white/25 text-xs font-bold flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]"
          >
            ?
          </button>

          <div className="relative w-48 h-48 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="40" fill="none" 
                stroke={progressPercent === 100 ? "#10B981" : "#1A5FB4"} 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`} 
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white">{data.currentCycleRides}</span>
              <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">of {data.ridesNeeded} rides</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-white font-bold text-xl mb-2">
              {ridesRemaining === 0 ? "Free Ride Unlocked! 🎉" : `${ridesRemaining} Rides to Free Ride`}
            </h2>
            <p className="text-white/40 text-sm mb-6">
              Complete {data.ridesNeeded} paid rides to earn a free ride voucher — GCash counts automatically, cash counts once you scan the receipt QR. Your total completed rides: <span className="text-[#62A0EA] font-bold">{data.totalRides}</span>.
            </p>
            <div className="flex gap-3 justify-center md:justify-start">
              <div className="bg-[#050F1A] border border-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-[10px] text-white/40 uppercase font-semibold">Total Rides</p>
                <p className="text-lg font-bold text-white">{data.totalRides}</p>
              </div>
              <div className="bg-[#050F1A] border border-white/10 rounded-xl px-4 py-3 text-center">
                <p className="text-[10px] text-white/40 uppercase font-semibold">Vouchers Available</p>
                <p className="text-lg font-bold text-emerald-400">{data.vouchers.filter(v => v.status === "AVAILABLE").length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. VOUCHERS LIST --- */}
        <div>
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">My Vouchers</h3>
          <div className="space-y-4">
            {data.vouchers.map(voucher => (
              <div key={voucher.id} className={`border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${getStatusColor(voucher.status)}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-base">Free Ride Voucher</h4>
                    <p className="text-xs opacity-70 mt-0.5">Source: {voucher.rideOrigin} • Exp: {new Date(voucher.expiresAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  {voucher.status === "AVAILABLE" && (
                    <button 
                      onClick={() => redeemVoucher(voucher.id)}
                      className="bg-[#FF6D3A] hover:bg-[#e55a2b] text-white text-sm font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-[#FF6D3A]/30 transition-colors"
                    >
                      Use Voucher
                    </button>
                  )}
                  {voucher.status === "ACTIVE" && (
                    <span className="text-sm font-bold uppercase tracking-wider animate-pulse">Active - Show to Conductor</span>
                  )}
                  {voucher.status === "USED" && (
                    <span className="text-sm font-bold uppercase tracking-wider opacity-50">Redeemed</span>
                  )}
                </div>
              </div>
            ))}

            {data.vouchers.length === 0 && (
              <div className="text-center py-12 bg-[#071A2E] rounded-2xl border border-white/10">
                <p className="text-white/40 text-sm">No vouchers yet. Keep riding to earn your first free ride!</p>
              </div>
            )}
          </div>
        </div>

        </div>
      </div>

      {/* --- RECEIPT SCAN MODAL --- */}
      {showReceiptScan && (
        <ReceiptScanModal
          onClose={() => setShowReceiptScan(false)}
          // A newly claimed ride changes the progress ring, and may have just
          // completed the cycle — the backend generates the voucher on read,
          // so refetching is what surfaces it.
          onClaimed={handleReceiptClaimed}
        />
      )}

      {/* --- "HOW REWARDS WORK" MODAL --- */}
      {showRewardsHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowRewardsHelp(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rewards-help-title"
        >
          <div
            className="bg-[#071A2E] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10">
              <h2 id="rewards-help-title" className="text-white font-bold text-lg leading-tight">
                How free rides work
              </h2>
              <p className="text-white/40 text-xs mt-1">
                Every {data.ridesNeeded} paid rides earns you one free ride.
              </p>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <HelpStep n={1} title="Ride and pay">
                Every ride you pay for counts as <span className="text-white font-semibold">+1</span> toward
                your next free ride. Pay with <span className="text-white font-semibold">GCash</span> and
                it&apos;s counted automatically the moment the fare is recorded.
              </HelpStep>

              <HelpStep n={2} title="Paid in cash? Scan the receipt">
                Cash fares aren&apos;t linked to your account on their own. The conductor&apos;s
                paper receipt has a QR on it — tap the scan button at the top right of
                this page and scan it to claim that ride. Each receipt can only be
                claimed once, and only for a limited time after the ride, so scan it
                before you throw it away.
              </HelpStep>

              <HelpStep n={3} title={`Hit ${data.ridesNeeded} and a voucher appears`}>
                At {data.ridesNeeded} rides a free ride voucher is added to
                &ldquo;My Vouchers&rdquo; below, and the counter resets to zero. The cycle
                repeats forever — every {data.ridesNeeded} rides earns another one, and
                you can hold several at once.
              </HelpStep>

              <HelpStep n={4} title="Redeem it on your next ride">
                Tap <span className="text-white font-semibold">Use Voucher</span>, then show
                the code to the conductor. They enter it and the ride is free. Vouchers
                expire <span className="text-white font-semibold">30 days</span> after you
                earn them, so use them before then.
              </HelpStep>

              <div className="bg-[#050F1A] border border-white/10 rounded-xl p-4">
                <p className="text-[11px] text-white/50 leading-relaxed">
                  <span className="text-white/70 font-semibold">One catch:</span> a ride you
                  pay for with a voucher is free, so it doesn&apos;t count toward the next
                  one. Only rides you actually pay for move the counter.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => setShowRewardsHelp(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold py-3 rounded-xl border border-white/10 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ACTIVE VOUCHER MODAL --- */}
      {showVoucherModal && activeVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowVoucherModal(false)}>
          <div className="bg-[#071A2E] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center border-b border-white/10">
              <h2 className="text-white font-bold text-xl">Voucher Activated!</h2>
              <p className="text-white/40 text-xs mt-1">Show this screen to the conductor</p>
            </div>
            <div className="p-8 flex flex-col items-center justify-center flex-1 bg-[#050F1A]">
              <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center shadow-lg mb-4">
                <div className="grid grid-cols-5 gap-1 w-24 h-24">
                  {Array.from({length: 25}).map((_, i) => (
                    <div key={i} className={`w-full h-full rounded-sm ${Math.random() > 0.3 ? 'bg-black' : 'bg-white'}`}></div>
                  ))}
                </div>
              </div>
              <p className="text-emerald-400 font-extrabold text-lg tracking-widest mt-2">{activeVoucher}</p>
            </div>
            <div className="p-4 border-t border-white/10">
              <button onClick={() => setShowVoucherModal(false)} className="w-full bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold py-3 rounded-xl border border-white/10 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ANNOUNCEMENT DETAIL MODAL --- */}
      {selectedAnnouncement && (() => {
        const config = announcementConfig[selectedAnnouncement.type];
        return (
          // pb-24 clears the commuter tab bar, which the layout renders as an
          // absolute overlay at the same z-50 — it was covering the bottom of
          // this panel, including part of the Close button.
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-24 lg:pb-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedAnnouncement(null)}>
            <div className="bg-[#071A2E] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-full" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.color}`}>
                    <span className="text-sm leading-none">{config.emoji}</span>
                    {config.label}
                  </div>
                  <span className="text-[11px] text-white/40">{formatRelativeTime(selectedAnnouncement.createdAt)}</span>
                </div>
                <h2 className="text-white font-bold text-lg leading-tight">{selectedAnnouncement.title}</h2>
              </div>
              {/* modal-scroll gives this a visible scrollbar so a long notice
                  reads as scrollable rather than truncated. */}
              <div className="p-6 overflow-y-auto modal-scroll">
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {selectedAnnouncement.message}
                </p>
              </div>
              <div className="p-4 border-t border-white/10">
                <button onClick={() => setSelectedAnnouncement(null)} className="w-full bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold py-3 rounded-xl border border-white/10 transition-colors">Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/** One numbered step in the "How free rides work" explainer. */
function HelpStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-[#1A5FB4] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </div>
      <div className="min-w-0">
        <h3 className="text-white text-sm font-bold">{title}</h3>
        <p className="text-white/50 text-xs leading-relaxed mt-1">{children}</p>
      </div>
    </div>
  );
}