"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { QrCode, RefreshCw } from "lucide-react";
import { useVoucherWallet } from "@/app/(commuter)/rewards/use-voucher-wallet";
import type { VoucherTab, WalletVoucher } from "@/app/(commuter)/rewards/types";

const TABS: { id: VoucherTab; label: string }[] = [
  { id: "available", label: "Available" },
  { id: "expired", label: "Expired" },
];

const EMPTY_COPY: Record<VoucherTab, { title: string; body: string }> = {
  available: { title: "No vouchers to use yet", body: "" },
  expired: { title: "Nothing has expired", body: "Vouchers you don't use before their date move here." },
};

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : "";
}

/** "Free ride" or "₱5.00 off" — the value is what the commuter reads first. */
function voucherValue(voucher: WalletVoucher) {
  return voucher.type === "DISCOUNT" ? `₱${(voucher.amount ?? 0).toFixed(2)} off` : "Free ride";
}

/** Plain-language urgency for a voucher close to its expiry, else null. */
function expiryHint(expiresAt: string, now: number) {
  const time = new Date(expiresAt).getTime();
  if (!Number.isFinite(time)) return null;
  const hours = (time - now) / 3_600_000;
  if (hours <= 0 || hours > 48) return null;
  if (hours < 1) return "Expires within the hour";
  if (hours < 24) return `Expires in ${Math.floor(hours)} h`;
  return "Expires tomorrow";
}

interface VoucherWalletProps {
  tab: VoucherTab;
  onTabChange: (tab: VoucherTab) => void;
  availableCount: number;
  ridesRemaining: number;
  /** Changes when the usable voucher set changes; reloads every tab. */
  resetKey: string;
  onScanReceipt: () => void;
}

/**
 * My Vouchers: Available / Expired tabs over a ticket-stub list that scrolls
 * inside its own fixed-height box and loads more as the commuter scrolls it. Each stub reads like a ride ticket:
 * the value on the left, a perforated tear line, and the validity (or how
 * it was used) on the right. There is no action here: an available voucher
 * is offered automatically when the commuter pays a fare by GCash (see
 * components/commuter/modals/scan-modal.tsx).
 */
export function VoucherWallet({ tab, onTabChange, availableCount, ridesRemaining, resetKey, onScanReceipt }: VoucherWalletProps) {
  const { items, isLoading, isLoadingMore, hasMore, error, loadMore, retry } = useVoucherWallet(tab, resetKey);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  // Reference time for the "Expires in …" hints. Read once on mount (render
  // must stay pure); the list remounts with the page, and an expired voucher
  // leaves this tab via resetKey anyway.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || error) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((entry) => entry.isIntersecting)) loadMore(); },
      { root: listRef.current, rootMargin: "0px 0px 320px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, error, loadMore, items.length]);

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((item) => item.id === tab);
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length
      : event.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length
      : -1;
    if (next < 0) return;
    event.preventDefault();
    onTabChange(TABS[next].id);
    tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <section aria-labelledby="vouchers-title" className="pt-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="vouchers-title" className="text-base font-semibold">My vouchers</h2>
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Voucher status"
          onKeyDown={onTabKey}
          className="grid w-full grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#071A2E] p-1 light:border-gray-200 light:bg-white sm:w-auto"
        >
          {TABS.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`voucher-tab-${item.id}`}
                aria-selected={active}
                aria-controls="voucher-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => onTabChange(item.id)}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors active:scale-[0.98] ${
                  active
                    ? "bg-[#1A5FB4] text-white"
                    : "text-white/60 hover:bg-[#0E2238] hover:text-white light:text-gray-500 light:hover:bg-gray-100 light:hover:text-gray-900"
                }`}
              >
                {item.label}
                {item.id === "available" && availableCount > 0 && (
                  <span className={`tabular-nums ${active ? "text-white/80" : "text-white/40 light:text-gray-400"}`}>{availableCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div id="voucher-panel" role="tabpanel" aria-labelledby={`voucher-tab-${tab}`} aria-busy={isLoading || isLoadingMore}>
        {isLoading ? (
          <>
            <span role="status" className="sr-only">Loading vouchers</span>
            <StubSkeletonList count={2} />
          </>
        ) : items.length === 0 ? (
          error ? <LoadError message={error} onRetry={retry} /> : (
            <div className="border-y border-white/10 py-9 light:border-gray-200">
              <h3 className="text-sm font-semibold">{EMPTY_COPY[tab].title}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50 light:text-gray-500">
                {tab === "available"
                  ? `Your next free ride arrives after ${ridesRemaining} more paid ride${ridesRemaining === 1 ? "" : "s"}. GCash rides count automatically.`
                  : EMPTY_COPY[tab].body}
              </p>
              {tab === "available" && (
                <button type="button" onClick={onScanReceipt} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#99C1F1] hover:text-white light:text-[#1A5FB4] light:hover:text-[#164A8F]">
                  <QrCode size={16} aria-hidden="true" /> Scan a cash receipt
                </button>
              )}
            </div>
          )
        ) : (
          // Keyed by tab so switching tabs starts the box back at the top.
          // Fixed card heights make the height exact: 5 rows of 96px + 8px
          // gaps below lg, 4 rows of 152px + 12px gaps (2 columns) on lg,
          // each with a ~40px peek of the next row so it reads as scrollable.
          <div
            key={tab}
            ref={listRef}
            tabIndex={0}
            aria-label={`${tab === "available" ? "Available" : "Expired"} vouchers`}
            className="max-h-[34.5rem] overflow-y-auto overscroll-contain rounded-xl pr-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#99C1F1] light:focus-visible:outline-[#1A5FB4] lg:max-h-[43rem]"
          >
            <ul className="grid gap-2 lg:grid-cols-2 lg:gap-3">
              {items.map((voucher, index) => (
                <li
                  key={voucher.id}
                  className="animate-fade-in"
                  // Each page cascades in; later pages restart the cascade.
                  style={{ animationDelay: `${(index % 15) * 35}ms`, animationFillMode: "both" }}
                >
                  <VoucherStub voucher={voucher} tab={tab} now={now} />
                </li>
              ))}
            </ul>

            {isLoadingMore && <div className="mt-2 lg:mt-3"><StubSkeletonList count={1} /></div>}
            {error && <div className="mt-4"><LoadError message={error} onRetry={retry} /></div>}
            <div ref={sentinelRef} aria-hidden="true" className="h-px" />
            {!hasMore && !error && items.length > 15 && (
              <p className="mt-5 text-center text-xs text-white/40 light:text-gray-400">That&apos;s every {tab} voucher.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function VoucherStub({ voucher, tab, now }: { voucher: WalletVoucher; tab: VoucherTab; now: number }) {
  const live = tab === "available";
  const hint = live && voucher.expiresAt ? expiryHint(voucher.expiresAt, now) : null;

  return (
    // Compact below lg so 5 rows fit on a phone; full stub on lg.
    <article className="relative grid h-24 grid-cols-[minmax(0,1fr)_8.75rem] overflow-hidden rounded-2xl border border-white/10 bg-[#071A2E] light:border-gray-200 light:bg-white sm:grid-cols-[minmax(0,1fr)_10rem] lg:h-[9.5rem]">
      {/* Value half */}
      <div className="flex min-w-0 flex-col justify-between gap-1 p-3 lg:gap-4 lg:p-5">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40 light:text-gray-500">{voucher.rideOrigin}</p>
          <p className={`mt-0.5 text-lg font-bold leading-tight tabular-nums lg:mt-1.5 lg:text-2xl ${live ? "text-white light:text-gray-900" : "text-white/55 light:text-gray-500"}`}>
            {voucherValue(voucher)}
          </p>
        </div>
        <p className="truncate font-mono text-[11px] text-white/40 light:text-gray-400" title={voucher.code}>{voucher.code}</p>
      </div>

      {/* Tear line: dashed rule with two half-circle notches cut from the edges. */}
      <span aria-hidden="true" className="pointer-events-none absolute bottom-3 top-3 border-l border-dashed border-white/15 light:border-gray-300 right-[8.75rem] sm:right-[10rem]" />
      <span aria-hidden="true" className="pointer-events-none absolute -top-2.5 h-5 w-5 translate-x-1/2 rounded-full border border-white/10 bg-[#050F1A] light:border-gray-200 light:bg-[#F8FAFC] right-[8.75rem] sm:right-[10rem]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-2.5 h-5 w-5 translate-x-1/2 rounded-full border border-white/10 bg-[#050F1A] light:border-gray-200 light:bg-[#F8FAFC] right-[8.75rem] sm:right-[10rem]" />

      {/* Stub half */}
      <div className="flex min-w-0 flex-col justify-between gap-3 p-3 lg:p-4 lg:pl-5">
        {tab === "expired" ? (
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40 light:text-gray-500">Expired</p>
            <p className="mt-0.5 text-sm font-medium lg:mt-1">{formatDate(voucher.expiresAt) || "Expired"}</p>
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40 light:text-gray-500">{voucher.expiresAt ? "Valid until" : "Validity"}</p>
              <p className="mt-0.5 text-sm font-medium lg:mt-1">{voucher.expiresAt ? formatDate(voucher.expiresAt) : "No expiry"}</p>
              {hint && <p className="mt-0.5 text-[11px] font-semibold leading-tight text-white light:text-gray-900 lg:mt-1 lg:text-xs">{hint}</p>}
            </div>
            {/* No room in the compact card; "How rewards work" explains it. */}
            <p className="hidden text-xs leading-snug text-white/50 light:text-gray-500 lg:block">Offered when you pay by GCash</p>
          </>
        )}
      </div>
    </article>
  );
}

/** Static placeholders shaped like the stubs (no pulsing, per the UI rules). */
function StubSkeletonList({ count }: { count: number }) {
  return (
    <ul aria-hidden="true" className="grid gap-2 lg:grid-cols-2 lg:gap-3">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="grid h-24 grid-cols-[minmax(0,1fr)_8.75rem] overflow-hidden rounded-2xl border border-white/10 bg-[#071A2E] light:border-gray-200 light:bg-white sm:grid-cols-[minmax(0,1fr)_10rem] lg:h-[9.5rem]">
          <div className="space-y-2 p-3 lg:space-y-3 lg:p-5">
            <div className="h-2.5 w-20 rounded bg-[#0E2238] light:bg-gray-100" />
            <div className="h-6 w-28 rounded bg-[#0E2238] light:bg-gray-100" />
          </div>
          <div className="space-y-2 border-l border-dashed border-white/10 p-3 light:border-gray-200 lg:space-y-3 lg:p-4">
            <div className="h-2.5 w-14 rounded bg-[#0E2238] light:bg-gray-100" />
            <div className="h-4 w-20 rounded bg-[#0E2238] light:bg-gray-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-5 light:border-gray-200">
      <p className="text-sm text-white/70 light:text-gray-600">{message}</p>
      <button type="button" onClick={onRetry} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-[#071A2E] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#0E2238] light:border-gray-200 light:bg-white light:text-gray-700 light:hover:bg-gray-100">
        <RefreshCw size={14} aria-hidden="true" /> Try again
      </button>
    </div>
  );
}
