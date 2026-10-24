"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { X, ChevronDown } from "lucide-react";
import { AdminDatePicker } from "@/components/admin/ui/admin-date-picker";
import {
  fetchShiftTransactionsPage,
  type Transaction,
} from "@/lib/conductor/services/transactions.service";
import { formatPeso } from "@/lib/utils/display";

interface HistoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
}

type PaymentFilter = "ALL" | "GCash" | "Cash" | "Voucher";
type BackendPaymentMethod = "CASH" | "GCASH" | "VOUCHER";
type DatePreset = "TODAY" | "LAST_7_DAYS" | "THIS_MONTH" | "ALL" | "CUSTOM";

const TRANSACTIONS_PER_PAGE = 25;

// No "All" option: tapping the selected option again clears it, which is
// what "All" did (all payments / all dates).
const PAYMENT_OPTIONS: { value: Exclude<PaymentFilter, "ALL">; label: string }[] = [
  { value: "GCash", label: "GCash" },
  { value: "Cash", label: "Cash" },
  { value: "Voucher", label: "Voucher" },
];

type PeriodPreset = Exclude<DatePreset, "CUSTOM" | "ALL">;
const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "LAST_7_DAYS", label: "7 days" },
  { value: "THIS_MONTH", label: "Month" },
];

// Solid in every state: CHATCO Blue for the selected option, a raised navy
// (white in light mode) for the rest. No colour per payment method.
const optionClass = (selected: boolean) =>
  `min-h-9 rounded-lg border px-2 text-xs font-semibold transition-colors active:scale-[0.98] ${
    selected
      ? "border-[#1A5FB4] bg-[#1A5FB4] text-white"
      : "border-white/10 bg-[#12304F] text-white/75 hover:bg-[#173A5E] hover:text-white light:border-gray-200 light:bg-white light:text-gray-700 light:hover:bg-gray-100 light:hover:text-gray-900"
  }`;

const neutralButtonClass =
  "rounded-lg border border-white/10 bg-[#12304F] px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-[#173A5E] disabled:cursor-not-allowed disabled:opacity-40 light:border-gray-200 light:bg-white light:text-gray-700 light:hover:bg-gray-100";

function toBackendPaymentMethod(method: PaymentFilter): BackendPaymentMethod | undefined {
  if (method === "Cash") return "CASH";
  if (method === "GCash") return "GCASH";
  if (method === "Voucher") return "VOUCHER";
  return undefined;
}

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  if (preset === "ALL" || preset === "CUSTOM") return { from: "", to: "" };
  if (preset === "THIS_MONTH") {
    return {
      from: formatInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: formatInputDate(today),
    };
  }
  if (preset === "LAST_7_DAYS") {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { from: formatInputDate(from), to: formatInputDate(today) };
  }
  return { from: formatInputDate(today), to: formatInputDate(today) };
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** The readout's description of the active date filter. */
function periodLabel(preset: DatePreset, from: string, to: string): string {
  if (preset === "TODAY") return "Today";
  if (preset === "LAST_7_DAYS") return "Last 7 days";
  if (preset === "THIS_MONTH") return "This month";
  if (!from && !to) return "All dates";
  if (from && to) return from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;
  return from ? `From ${shortDate(from)}` : `Until ${shortDate(to)}`;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-3 py-1.5">
      <dt className="text-white/45 light:text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium tabular-nums text-white light:text-gray-900">{children}</dd>
    </div>
  );
}

export default function HistoryLogModal({ isOpen, onClose, shiftId }: HistoryLogModalProps) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState<PaymentFilter>("ALL");
  const [datePreset, setDatePreset] = useState<DatePreset>("TODAY");
  const [dateFrom, setDateFrom] = useState(() => getPresetRange("TODAY").from);
  const [dateTo, setDateTo] = useState(() => getPresetRange("TODAY").to);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  // Phones only: the filters fold away so the list gets the screen.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const requestSeqRef = useRef(0);

  const loadPage = useCallback(
    async (
      page: number,
      filters: { method: PaymentFilter; from: string; to: string }
    ) => {
      if (!shiftId) return;

      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;
      setIsLoading(true);
      setExpandedId(null);
      setHistory([]);

      try {
        const result = await fetchShiftTransactionsPage(shiftId, {
          page,
          perPage: TRANSACTIONS_PER_PAGE,
          paymentMethod: toBackendPaymentMethod(filters.method),
          dateFrom: filters.from || undefined,
          dateTo: filters.to || undefined,
        });

        if (requestSeqRef.current !== requestSeq) return;

        setHistory(result.transactions);
        setCurrentPage(result.currentPage);
        setTotalTransactions(result.total);
        setTotalPages(Math.max(1, result.totalPages));
        setFilteredTotal(result.totalAmount);
      } catch {
        if (requestSeqRef.current !== requestSeq) return;

        setHistory([]);
        setCurrentPage(1);
        setTotalTransactions(0);
        setTotalPages(1);
        setFilteredTotal(0);
      } finally {
        if (requestSeqRef.current === requestSeq) {
          setIsLoading(false);
        }
      }
    },
    [shiftId]
  );

  const openKey = isOpen ? shiftId : null;
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (isOpen && shiftId) {
      const todayRange = getPresetRange("TODAY");
      setExpandedId(null);
      setFiltersOpen(false);
      setDatePreset("TODAY");
      setDateFrom(todayRange.from);
      setDateTo(todayRange.to);
      setFilterMethod("ALL");
      setCurrentPage(1);
      setTotalTransactions(0);
      setTotalPages(1);
      setFilteredTotal(0);
      void loadPage(1, { method: "ALL", from: todayRange.from, to: todayRange.to });
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const hasDateFilter = datePreset !== "ALL" || dateFrom !== "" || dateTo !== "";
  const hasActiveFilter = filterMethod !== "ALL" || hasDateFilter;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const clearDateFilter = () => {
    setDatePreset("ALL");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
    void loadPage(1, { method: filterMethod, from: "", to: "" });
  };

  const applyPreset = (preset: PeriodPreset) => {
    const range = getPresetRange(preset);
    setDatePreset(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
    setCurrentPage(1);
    void loadPage(1, { method: filterMethod, from: range.from, to: range.to });
  };

  // Picking either date switches to a custom range, as the native inputs did.
  const applyDates = (from: string, to: string) => {
    setDatePreset("CUSTOM");
    setDateFrom(from);
    setDateTo(to);
    setCurrentPage(1);
    void loadPage(1, { method: filterMethod, from, to });
  };

  const goToPage = (page: number) => {
    void loadPage(page, { method: filterMethod, from: dateFrom, to: dateTo });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-log-title"
        className="relative mb-16 flex h-[92dvh] max-h-[920px] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#071A2E] shadow-2xl sm:mx-4 sm:mb-0 sm:h-[90dvh] sm:rounded-2xl light:border-gray-200 light:bg-white light:shadow-black/10"
      >
        {/* Readout first: what the current filter adds up to, then how it's filtered. */}
        <div className="shrink-0 px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <h2 id="history-log-title" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40 light:text-gray-500">
              Transaction History
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1.5 -mt-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-[#12304F] hover:text-white light:text-gray-500 light:hover:bg-gray-100 light:hover:text-gray-900"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
          <p className="mt-1 text-[36px] font-bold leading-none tracking-tight tabular-nums text-white light:text-gray-900" aria-live="polite">
            {isLoading ? "—" : formatPeso(filteredTotal)}
          </p>
          <p className="mt-2 text-xs text-white/55 light:text-gray-500">
            {isLoading ? "Loading…" : `${totalTransactions} transaction${totalTransactions !== 1 ? "s" : ""}`}
            <span className="text-white/25 light:text-gray-300"> · </span>
            {periodLabel(datePreset, dateFrom, dateTo)}
            {filterMethod !== "ALL" && <><span className="text-white/25 light:text-gray-300"> · </span>{filterMethod}</>}
          </p>
        </div>

        <div className="shrink-0 border-y border-white/10 bg-[#0B223A] light:border-gray-200 light:bg-gray-50">
          {/* Phones: one row that folds the filters away. sm:+ shows them open. */}
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="history-log-filters"
            className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left sm:hidden"
          >
            <span className="text-xs font-semibold text-white light:text-gray-900">Filters</span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs text-white/50 light:text-gray-500">
                {periodLabel(datePreset, dateFrom, dateTo)} · {filterMethod === "ALL" ? "All payments" : filterMethod}
              </span>
              <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-white/40 transition-transform duration-300 light:text-gray-400 ${filtersOpen ? "rotate-180" : ""}`} />
            </span>
          </button>

          <div
            id="history-log-filters"
            className={`grid transition-[grid-template-rows,visibility] duration-300 ease-in-out sm:visible sm:grid-rows-[1fr] ${
              filtersOpen ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              {/* Label column + controls: each group reads as one line. */}
              <div className="space-y-2.5 px-5 pb-4 sm:pt-4">
                <div className="grid grid-cols-[64px_1fr] items-center gap-3">
                  <span className="text-[11px] font-semibold text-white/50 light:text-gray-500">Payment</span>
                  <div role="group" aria-label="Payment method" className="grid grid-cols-3 gap-1.5">
                    {PAYMENT_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={filterMethod === value}
                        onClick={() => {
                          const method = filterMethod === value ? "ALL" : value;
                          setFilterMethod(method);
                          setCurrentPage(1);
                          void loadPage(1, { method, from: dateFrom, to: dateTo });
                        }}
                        className={optionClass(filterMethod === value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-[64px_1fr] items-center gap-3">
                  <span className="text-[11px] font-semibold text-white/50 light:text-gray-500">Period</span>
                  <div role="group" aria-label="Period" className="grid grid-cols-3 gap-1.5">
                    {PERIOD_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={datePreset === value}
                        onClick={() => (datePreset === value ? clearDateFilter() : applyPreset(value))}
                        className={optionClass(datePreset === value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-[64px_1fr] items-center gap-3">
                  <span className="text-[11px] font-semibold text-white/50 light:text-gray-500">Dates</span>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <AdminDatePicker
                      value={dateFrom}
                      onChange={(next) => applyDates(next, dateTo)}
                      max={dateTo || undefined}
                      ariaLabel="From date"
                      placeholder="From"
                      clearLabel="Clear from date"
                      popover
                      yearNavigation
                      className="min-w-0"
                      triggerClassName="w-full py-2"
                    />
                    <span className="text-[11px] text-white/40 light:text-gray-400">to</span>
                    <AdminDatePicker
                      value={dateTo}
                      onChange={(next) => applyDates(dateFrom, next)}
                      min={dateFrom || undefined}
                      align="right"
                      ariaLabel="To date"
                      placeholder="To"
                      clearLabel="Clear to date"
                      popover
                      yearNavigation
                      className="min-w-0"
                      triggerClassName="w-full py-2"
                    />
                  </div>
                </div>

                <p className="pl-[76px] text-[10px] text-white/40 light:text-gray-400">Tap a selected option again to show all.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-scroll min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <ul aria-hidden="true" className="divide-y divide-white/10 light:divide-gray-200">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 px-5 py-4">
                  <span className="h-3 w-10 rounded bg-[#12304F] light:bg-gray-200" />
                  <span className="space-y-2">
                    <span className="block h-3 w-32 rounded bg-[#12304F] light:bg-gray-200" />
                    <span className="block h-2.5 w-44 max-w-full rounded bg-[#0B223A] light:bg-gray-100" />
                  </span>
                  <span className="h-3 w-14 rounded bg-[#12304F] light:bg-gray-200" />
                </li>
              ))}
            </ul>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <p className="text-sm font-semibold text-white light:text-gray-900">No transactions here.</p>
              <p className="mx-auto mt-1 max-w-[32ch] text-xs leading-relaxed text-white/50 light:text-gray-500">
                {hasActiveFilter ? "Nothing matches this period or payment method." : "Fares you record this shift show up here."}
              </p>
              {hasDateFilter && (
                <button type="button" onClick={clearDateFilter} className={`mt-4 ${neutralButtonClass}`}>
                  Show all dates
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-white/10 light:divide-gray-200">
              {history.map((tx) => {
                const isExpanded = expandedId === tx.transactionId;
                const when = new Date(tx.timestamp);
                const displayDate = when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const displayTime = when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                const succeedingFare = tx.distance > 1
                  ? (tx.baseFare + (tx.succeedingKm * (tx.distance - 1))) - tx.baseFare
                  : 0;
                const method = tx.paymentMethod.startsWith("GCash") ? "GCash" : tx.paymentMethod;

                return (
                  <li key={tx.transactionId} className={isExpanded ? "bg-[#0B223A] light:bg-gray-50" : undefined}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(tx.transactionId)}
                      aria-expanded={isExpanded}
                      className="grid w-full grid-cols-[56px_1fr_auto] items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#0B223A] light:hover:bg-gray-50"
                    >
                      <span className="text-xs font-semibold tabular-nums text-white/75 light:text-gray-700">
                        {displayTime}
                        <span className="mt-0.5 block text-[10px] font-normal text-white/40 light:text-gray-400">
                          {when.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white light:text-gray-900">{tx.passengerName}</span>
                        <span className="mt-0.5 block truncate text-xs text-white/45 light:text-gray-500">{tx.from} → {tx.to}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-right">
                          <span className="block text-sm font-bold tabular-nums text-white light:text-gray-900">{formatPeso(tx.finalAmount)}</span>
                          <span className="mt-0.5 block text-[10px] font-medium text-white/45 light:text-gray-500">{method}</span>
                        </span>
                        <ChevronDown size={16} aria-hidden="true" className={`text-white/35 transition-transform light:text-gray-400 ${isExpanded ? "rotate-180" : ""}`} />
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="space-y-3 px-5 pb-4 text-xs">
                        <dl className="divide-y divide-white/10 border-t border-white/10 light:divide-gray-200 light:border-gray-200">
                          <DetailRow label="Fare">{formatPeso(tx.finalAmount)}</DetailRow>
                          <DetailRow label="First km">{formatPeso(tx.baseFare)}</DetailRow>
                          <DetailRow label="Succeeding">{formatPeso(succeedingFare)}</DetailRow>
                          {(tx.discountAmount ?? 0) > 0 && <DetailRow label="Discount">− {formatPeso(tx.discountAmount ?? 0)}</DetailRow>}
                          <DetailRow label="Distance">{tx.distance} km</DetailRow>
                          <DetailRow label="Payment">{method}</DetailRow>
                        </dl>
                        <dl className="divide-y divide-white/10 border-t border-white/10 light:divide-gray-200 light:border-gray-200">
                          <DetailRow label="Passenger">{tx.passengerName}</DetailRow>
                          <DetailRow label="Passenger ID">{tx.passengerId}</DetailRow>
                          {tx.passengerRole && <DetailRow label="Type">{tx.passengerRole}</DetailRow>}
                        </dl>
                        <dl className="divide-y divide-white/10 border-t border-white/10 light:divide-gray-200 light:border-gray-200">
                          <DetailRow label="Unit">{tx.unitNumber}</DetailRow>
                          <DetailRow label="Driver">{tx.driverName}</DetailRow>
                          <DetailRow label="Conductor">{tx.conductorName}</DetailRow>
                          <DetailRow label="Recorded">{displayDate}, {displayTime}</DetailRow>
                          <DetailRow label="Txn ID"><span className="font-mono text-[11px]">{tx.transactionId}</span></DetailRow>
                        </dl>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-5 py-3 light:border-gray-200">
          <p className="text-[11px] tabular-nums text-white/45 light:text-gray-500">
            {totalTransactions > 0
              ? `${(safeCurrentPage - 1) * TRANSACTIONS_PER_PAGE + 1}–${Math.min(safeCurrentPage * TRANSACTIONS_PER_PAGE, totalTransactions)} of ${totalTransactions}`
              : "0 of 0"}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => goToPage(Math.max(1, safeCurrentPage - 1))} disabled={isLoading || safeCurrentPage === 1} className={neutralButtonClass}>
              Previous
            </button>
            <span className="text-[11px] tabular-nums text-white/45 light:text-gray-500">{safeCurrentPage} / {totalPages}</span>
            <button type="button" onClick={() => goToPage(Math.min(totalPages, safeCurrentPage + 1))} disabled={isLoading || safeCurrentPage === totalPages} className={neutralButtonClass}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
