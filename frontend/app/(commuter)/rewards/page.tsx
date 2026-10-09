"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight, Bell, Check, CheckCheck, ChevronRight, CircleHelp,
  Copy, Gift, History, Loader2, QrCode, RefreshCw, Ticket,
} from "lucide-react";
import { PageTabs } from "@/components/admin/ui/page-tabs";
import { Modal } from "@/components/shared/modal";
import { useAnnouncements } from "@/contexts/announcements-context";
import { useRewards } from "./use-rewards";
import type { Announcement, AnnouncementType, Voucher } from "./types";

const ReceiptScanModal = dynamic(
  () => import("@/components/commuter/modals/receipt-scan-modal"),
  { ssr: false }
);

const announcementConfig: Record<AnnouncementType, { label: string; color: string }> = {
  PROMO: { label: "Promo", color: "text-amber-300" },
  SAFETY: { label: "Safety", color: "text-emerald-300" },
  SYSTEM: { label: "System", color: "text-[#62A0EA]" },
  MAINTENANCE: { label: "Advisory", color: "text-red-300" },
  CLAIM_UPDATE: { label: "Claim update", color: "text-[#99C1F1]" },
  SAVED_ITEM: { label: "Saved item", color: "text-[#99C1F1]" },
  CUSTOM: { label: "Announcement", color: "text-white/60" },
};

function announcementCategory(item: Announcement) {
  const config = announcementConfig[item.type] ?? announcementConfig.CUSTOM;
  return { ...config, label: item.type === "CUSTOM" && item.rawType ? item.rawType : config.label };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : "";
}

function voucherStatus(voucher: Voucher): Voucher["status"] {
  return voucher.status === "AVAILABLE" && voucher.expiresAt && new Date(voucher.expiresAt).getTime() <= Date.now()
    ? "EXPIRED" : voucher.status;
}

export default function RewardsPage() {
  const {
    data, isLoading, error, refetch, progressPercent, ridesRemaining,
    showVoucherModal, setShowVoucherModal, activeVoucher, redeemVoucher,
  } = useRewards();
  const { announcements, isLoading: announcementsLoading, markAsRead, markAllAsRead, unreadCount } = useAnnouncements();
  const [section, setSection] = useState<"rewards" | "announcements">("rewards");
  const [voucherFilter, setVoucherFilter] = useState<"available" | "history">("available");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showReceiptScan, setShowReceiptScan] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogOpen = showHelp || showVoucherModal || selectedAnnouncement !== null;

  // Keep keyboard focus in the active rewards dialog and restore its trigger.
  useEffect(() => {
    if (!dialogOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const controls = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]') ?? []);
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowHelp(false);
        setShowVoucherModal(false);
        setSelectedAnnouncement(null);
      }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [dialogOpen, setShowVoucherModal]);

  const available = (data?.vouchers ?? []).filter(voucher => voucherStatus(voucher) === "AVAILABLE");
  const history = (data?.vouchers ?? []).filter(voucher => voucherStatus(voucher) !== "AVAILABLE");
  const visibleVouchers = voucherFilter === "available" ? available : history;
  const visibleAnnouncements = unreadOnly ? announcements.filter(item => !item.isRead) : announcements;
  const selectedCategory = selectedAnnouncement ? announcementCategory(selectedAnnouncement) : null;
  const selectedVoucher = data?.vouchers.find(voucher => voucher.code === activeVoucher);
  const selectedVoucherAvailable = selectedVoucher && voucherStatus(selectedVoucher) === "AVAILABLE";
  const progress = Math.min(100, Math.max(0, Number.isFinite(progressPercent) ? progressPercent : 0));
  const remaining = Math.max(0, ridesRemaining);

  const refreshRewards = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try { await refetch(); } finally { setIsRefreshing(false); }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#050F1A] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#071A2E]">
        <div className="mx-auto max-w-4xl px-4 pt-5 lg:px-8 lg:pt-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold lg:text-2xl">Rewards & Updates</h1>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowHelp(true)} aria-label="How rewards work" title="How rewards work" className="hidden h-10 w-10 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white lg:flex">
                <CircleHelp size={19} />
              </button>
              <button type="button" onClick={() => setShowReceiptScan(true)} aria-label="Scan receipt" title="Scan receipt QR" className="inline-flex h-11 w-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#050F1A] text-sm font-semibold transition-colors hover:bg-white/5 lg:h-10 lg:w-auto lg:rounded-lg lg:border-transparent lg:bg-[#1A5FB4] lg:px-3 lg:hover:bg-[#164A8F]">
                <QrCode size={19} /><span className="hidden lg:inline">Scan receipt</span>
              </button>
            </div>
          </div>
          <PageTabs
            activeId={section}
            onChange={next => { setSection(next); scrollRef.current?.scrollTo({ top: 0 }); }}
            tabs={[
              { id: "rewards", label: "Rewards", icon: Ticket, count: available.length || undefined },
              { id: "announcements", label: "Updates", icon: Bell, count: unreadCount || undefined },
            ]}
          />
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div role="tabpanel" aria-label={section === "rewards" ? "Rewards" : "Updates"} className="mx-auto max-w-4xl px-4 pb-28 pt-6 lg:px-8 lg:pt-8">
          {section === "rewards" ? (
            isLoading ? <LoadingState label="Loading rewards" /> : !data ? (
              <div className="py-12 text-center">
                <h2 className="text-lg font-semibold">Rewards are unavailable</h2>
                <p role="alert" className="mt-2 text-sm text-white/60">{error ?? "Please try again."}</p>
                <button onClick={() => void refreshRewards()} disabled={isRefreshing} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1A5FB4] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                  <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> Try again
                </button>
              </div>
            ) : (
              <>
                {error && <p role="alert" className="mb-5 border-l-2 border-amber-400 pl-3 text-sm text-amber-300">{error} Showing your last loaded rewards.</p>}
                <section aria-labelledby="mobile-progress-title" className="relative flex flex-col items-center gap-8 rounded-2xl border border-white/10 bg-[#071A2E] p-6 pt-12 shadow-xl shadow-black/20 md:flex-row md:p-8 lg:hidden">
                  <button type="button" onClick={() => setShowHelp(true)} aria-label="How rewards work" title="How rewards work" className="absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#050F1A] text-white/50 hover:text-white">
                    <CircleHelp size={16} />
                  </button>
                  <div role="progressbar" aria-label="Paid rides toward your next free ride" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${data.currentCycleRides} of ${data.ridesNeeded} paid rides`} className="relative h-48 w-48 shrink-0">
                    <svg aria-hidden="true" className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke={progress === 100 ? "#10B981" : "#1A5FB4"} strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * (1 - progress / 100)} className="transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold tabular-nums">{data.currentCycleRides}</span>
                      <span className="text-[10px] font-semibold uppercase text-white/50">of {data.ridesNeeded} rides</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-center md:text-left">
                    <h2 id="mobile-progress-title" className="mb-2 text-xl font-bold">{remaining === 0 ? "Free Ride Unlocked!" : `${remaining} Ride${remaining === 1 ? "" : "s"} to Free Ride`}</h2>
                    <p className="mb-6 text-sm leading-relaxed text-white/50">Complete {data.ridesNeeded} paid rides to earn a free ride voucher. GCash counts automatically; cash counts once you scan the receipt QR.</p>
                    <dl className="flex flex-wrap justify-center gap-6 md:justify-start">
                      <div><dt className="text-[10px] font-semibold uppercase text-white/50">Total Rides</dt><dd className="mt-1 text-lg font-bold tabular-nums">{data.totalRides}</dd></div>
                      <div><dt className="text-[10px] font-semibold uppercase text-white/50">Vouchers Available</dt><dd className="mt-1 text-lg font-bold tabular-nums text-emerald-400">{available.length}</dd></div>
                    </dl>
                  </div>
                </section>
                <section aria-labelledby="progress-title" className="hidden border-b border-white/10 pb-7 lg:block">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-[#99C1F1]">Next free ride</p>
                      <h2 id="progress-title" className="mt-2 text-xl font-bold">
                        {remaining === 0 ? "Free ride earned" : `${remaining} more paid ride${remaining === 1 ? "" : "s"}`}
                      </h2>
                    </div>
                    <button onClick={() => void refreshRewards()} disabled={isRefreshing} aria-label="Refresh rewards" title="Refresh rewards" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-50">
                      <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                    </button>
                  </div>
                  <div className="mt-5 flex items-baseline justify-between gap-3 text-sm">
                    <p><span className="font-semibold tabular-nums">{data.currentCycleRides}</span><span className="text-white/50"> / {data.ridesNeeded} rides</span></p>
                    <span className="text-xs text-white/50">{data.totalRides} paid rides total</span>
                  </div>
                  <div role="progressbar" aria-label="Paid rides toward your next free ride" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${data.currentCycleRides} of ${data.ridesNeeded} paid rides`} className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#62A0EA] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-white/60">GCash rides count automatically. Scan your cash receipt to add a paid ride.</p>
                </section>

                <section aria-labelledby="vouchers-title" className="pt-7">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 id="vouchers-title" className="text-sm font-bold uppercase text-white/70 lg:text-base lg:font-semibold lg:normal-case lg:text-white"><span className="lg:hidden">My Vouchers</span><span className="hidden lg:inline">Your vouchers</span></h2>
                    <div role="group" aria-label="Voucher filter" className="hidden gap-1 rounded-lg border border-white/10 p-1 lg:flex">
                      {(["available", "history"] as const).map(filter => (
                        <button key={filter} aria-pressed={voucherFilter === filter} onClick={() => setVoucherFilter(filter)} className={`flex min-h-8 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${voucherFilter === filter ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>
                          {filter === "history" && <History size={13} />}
                          {filter === "available" ? `Available (${available.length})` : "History"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {data.vouchers.length > 0 && (
                    <ul className="space-y-3">
                      {data.vouchers.map(voucher => {
                        const status = voucherStatus(voucher);
                        const expiry = formatDate(voucher.expiresAt);
                        const matchesFilter = voucherFilter === "available" ? status === "AVAILABLE" : status !== "AVAILABLE";
                        return (
                          <li key={voucher.id} className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 lg:rounded-lg ${!matchesFilter ? "lg:hidden" : ""} ${status === "AVAILABLE" ? "border-emerald-500/30 bg-emerald-500/10 lg:border-[#62A0EA]/30 lg:bg-[#071A2E]" : status === "EXPIRED" ? "border-red-500/30 bg-red-500/10 lg:border-white/10 lg:bg-white/[0.02]" : "border-white/10 bg-white/5 lg:bg-white/[0.02]"}`}>
                            <Gift size={24} aria-hidden="true" className={`shrink-0 lg:hidden ${status === "AVAILABLE" ? "text-emerald-400" : status === "EXPIRED" ? "text-red-400" : "text-white/40"}`} />
                            <div className="min-w-0 flex-1 basis-44">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold lg:text-sm lg:font-semibold"><span className="lg:hidden">Free Ride Voucher</span><span className="hidden lg:inline">Free ride</span></h3>
                                <span className={`text-xs ${status === "AVAILABLE" ? "text-emerald-300" : status === "EXPIRED" ? "text-white/50" : "text-white/60"}`}>
                                  {status === "AVAILABLE" ? "Ready to use" : status === "USED" ? "Used" : "Expired"}
                                </span>
                              </div>
                              <p className="mt-1 break-words text-xs text-white/50">{voucher.rideOrigin}</p>
                              {expiry && <p className="mt-3 text-xs text-white/70">{status === "EXPIRED" ? "Expired" : "Valid until"} {expiry}</p>}
                            </div>
                            {status === "AVAILABLE" && (
                              <button onClick={() => { setCopyStatus("idle"); redeemVoucher(voucher.id); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1A5FB4] px-4 text-sm font-semibold transition-colors hover:bg-[#164A8F] lg:rounded-lg">
                                <span className="lg:hidden">Use Voucher</span><span className="hidden lg:inline">Show code</span><ArrowRight size={16} className="hidden lg:block" />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {data.vouchers.length === 0 && <div className="rounded-2xl border border-white/10 bg-[#071A2E] py-12 text-center lg:hidden"><p className="text-sm text-white/50">No vouchers yet. Keep riding to earn your first free ride!</p></div>}
                  {visibleVouchers.length === 0 && (
                    <div className="hidden border-y border-white/10 py-9 lg:block">
                      <h3 className="text-sm font-semibold">{voucherFilter === "available" ? "No available vouchers" : "No recent voucher history"}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/50">
                        {voucherFilter === "available" ? `Your next free ride voucher arrives after ${data.ridesNeeded} paid rides.` : "Used and expired vouchers appear here."}
                      </p>
                      {voucherFilter === "available" && <button onClick={() => setShowReceiptScan(true)} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#99C1F1] hover:text-white"><QrCode size={16} /> Scan a cash receipt</button>}
                    </div>
                  )}
                  {data.archivedVoucherCount > 0 && <p className={`mt-4 text-xs text-white/50 ${voucherFilter !== "history" ? "lg:hidden" : ""}`}>{data.archivedVoucherCount} older used or expired voucher{data.archivedVoucherCount === 1 ? " is" : "s are"} archived.</p>}
                </section>
              </>
            )
          ) : (
            <section aria-labelledby="updates-title">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 id="updates-title" className="text-base font-semibold">Announcements</h2>
                <button onClick={markAllAsRead} disabled={unreadCount === 0 || announcementsLoading} className="inline-flex items-center gap-2 text-xs font-medium text-[#99C1F1] hover:text-white disabled:text-white/30"><CheckCheck size={16} /> Mark all read</button>
              </div>
              <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-xs text-white/70"><input type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} className="h-4 w-4 accent-[#1A5FB4]" /> Unread only</label>
              {announcementsLoading ? <LoadingState label="Loading updates" /> : visibleAnnouncements.length === 0 ? (
                <div className="border-y border-white/10 py-9">
                  <h3 className="text-sm font-semibold">{unreadOnly ? "No unread updates" : "No updates right now"}</h3>
                  {unreadOnly && <button onClick={() => setUnreadOnly(false)} className="mt-3 text-sm text-[#99C1F1] hover:text-white">View all updates</button>}
                </div>
              ) : (
                <ul className="space-y-3 lg:space-y-0 lg:divide-y lg:divide-white/10 lg:border-y lg:border-white/10">
                  {visibleAnnouncements.map(item => {
                    const category = announcementCategory(item);
                    return (
                      <li key={item.id}>
                        <button onClick={() => { markAsRead(item.id); setSelectedAnnouncement(item); }} className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-[#071A2E] p-4 text-left transition-colors hover:bg-white/[0.03] lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-5">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.isRead ? "bg-transparent" : "bg-[#62A0EA]"}`} aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span className={`break-words ${category.color}`}>{category.label}{!item.isRead && <span className="ml-2 text-white/60">Unread</span>}</span><time dateTime={item.createdAt} className="text-white/40">{formatDate(item.createdAt)}</time></div>
                            <h3 className={`break-words text-sm font-semibold ${item.isRead ? "text-white/70" : "text-white"}`}>{item.title}</h3>
                            <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-white/50">{item.message}</p>
                          </div>
                          <ChevronRight size={16} className="mt-1 shrink-0 text-white/40" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
      </div>

      {showReceiptScan && <ReceiptScanModal onClose={() => setShowReceiptScan(false)} />}
      <div ref={dialogRef} className="relative z-[100]">
        <Modal isOpen={showHelp} onClose={() => setShowHelp(false)}>
          <h2 className="pr-8 text-lg font-bold">How rewards work</h2>
          <ol className="mt-6 space-y-5 text-sm leading-relaxed text-white/60">
            <li><h3 className="mb-1 font-semibold text-white">1. Complete paid rides</h3>GCash rides count automatically. For cash rides, scan the QR on your conductor&apos;s receipt. Each receipt can be claimed once within its claim window.</li>
            <li><h3 className="mb-1 font-semibold text-white">2. Earn a free ride</h3>Every {data?.ridesNeeded ?? 10} paid rides earns a voucher. Your progress then starts toward the next voucher.</li>
            <li><h3 className="mb-1 font-semibold text-white">3. Show your code</h3>Open an available voucher and show its code to the conductor. It is marked used after the conductor records your free fare.</li>
          </ol>
          <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/60">Check each voucher&apos;s expiry date before riding. Free rides paid with vouchers do not count toward the next reward.</p>
        </Modal>
        <Modal isOpen={showVoucherModal && !!activeVoucher} onClose={() => setShowVoucherModal(false)} maxWidth="max-w-sm">
          <h2 className="pr-8 text-lg font-bold">Free ride voucher</h2>
          {selectedVoucherAvailable ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-white/60">Show this code to the conductor for your free fare.</p>
              <div className="my-6 border-y border-white/10 py-6">
                <p className="text-xs text-white/50">Voucher code</p>
                <p className="mt-2 break-all font-mono text-2xl font-bold text-[#99C1F1]">{activeVoucher}</p>
                {selectedVoucher?.expiresAt && <p className="mt-3 text-xs text-white/60">Valid until {formatDate(selectedVoucher.expiresAt)}</p>}
              </div>
              <button onClick={async () => {
                try { await navigator.clipboard.writeText(activeVoucher ?? ""); setCopyStatus("copied"); }
                catch { setCopyStatus("error"); }
              }} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1A5FB4] text-sm font-semibold hover:bg-[#164A8F]">
                {copyStatus === "copied" ? <Check size={16} /> : <Copy size={16} />}{copyStatus === "copied" ? "Code copied" : "Copy code"}
              </button>
              <p role="status" className="mt-3 text-xs leading-relaxed text-white/60">{copyStatus === "error" ? "Could not copy. You can still show the code above." : "Opening this code does not use your voucher. The conductor records the free fare."}</p>
            </>
          ) : <p role="status" className="mt-4 text-sm text-white/60">This voucher is no longer available. Close this window to check your vouchers.</p>}
        </Modal>
        <Modal isOpen={selectedAnnouncement !== null} onClose={() => setSelectedAnnouncement(null)} maxWidth="max-w-lg">
          {selectedAnnouncement && <>
            <p className={`pr-8 text-xs ${selectedCategory?.color}`}>{selectedCategory?.label}</p>
            <h2 className="mt-3 break-words pr-8 text-lg font-bold">{selectedAnnouncement.title}</h2>
            <p className="mt-2 text-xs text-white/50">{formatDate(selectedAnnouncement.createdAt)}</p>
            <p className="mt-5 whitespace-pre-wrap break-words border-t border-white/10 pt-5 text-sm leading-relaxed text-white/70">{selectedAnnouncement.message}</p>
          </>}
        </Modal>
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return <div role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-white/60"><Loader2 size={20} className="animate-spin" />{label}</div>;
}
