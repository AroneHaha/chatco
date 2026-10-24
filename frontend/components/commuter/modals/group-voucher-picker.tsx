"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { formatCurrency } from "@/lib/shared/fare/fare-calculator";
import { planGroupVouchers } from "@/lib/commuter/group-voucher-plan";
import type { ClaimResult, VoucherOption } from "@/lib/commuter/services/payment.service";

const TYPE_LABEL: Record<string, string> = {
  REGULAR: "Regular",
  STUDENT: "Student",
  SENIOR: "Senior",
  SENIOR_CITIZEN: "Senior",
  PWD: "PWD",
};

function voucherLabel(voucher: VoucherOption) {
  return voucher.type === "DISCOUNT" ? `${formatCurrency(voucher.amount ?? 0)} off` : "Free ride";
}

function expiryLabel(expiresAt: string | null) {
  if (!expiresAt) return "No expiry";
  const date = new Date(expiresAt);
  return Number.isFinite(date.getTime())
    ? `Valid until ${date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`
    : "";
}

interface GroupVoucherPickerProps {
  claim: ClaimResult;
  onUse: (voucherIds: string[]) => void;
  onPayInstead: () => void;
}

/**
 * Voucher choice for a group GCash payment: the payer can spend one voucher
 * per passenger. Free rides cover whole seats (dearest first), discounts come
 * off the group total, and the summary shows what GCash will still charge
 * before anything is spent. Nothing is pre-selected, so a voucher is only
 * used when the payer picks it.
 */
export function GroupVoucherPicker({ claim, onUse, onPayInstead }: GroupVoucherPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const seats = claim.seats;
  const groupFare = useMemo(() => seats.reduce((sum, seat) => sum + seat.fare, 0), [seats]);
  const chosen = useMemo(
    () => claim.availableVouchers.filter((voucher) => selected.includes(voucher.id)),
    [claim.availableVouchers, selected],
  );
  const plan = useMemo(() => planGroupVouchers(seats, chosen), [seats, chosen]);
  const full = selected.length >= seats.length;

  // A voucher that would reduce nothing once added (every seat already
  // covered, or the total already ₱0) can't be picked; the backend would
  // refuse it rather than spend it.
  const wouldBeWasted = (voucher: VoucherOption) =>
    !selected.includes(voucher.id) && planGroupVouchers(seats, [...chosen, voucher]).unused.length > 0;

  const toggle = (voucher: VoucherOption) =>
    setSelected((prev) => (prev.includes(voucher.id) ? prev.filter((id) => id !== voucher.id) : [...prev, voucher.id]));

  const freeCount = plan.freeSeats.length;
  const freeBreakdown = Object.entries(
    plan.freeSeats.reduce<Record<string, number>>((acc, seat) => {
      const label = TYPE_LABEL[seat.passengerType ?? "REGULAR"] ?? "Regular";
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, count]) => `${count} ${label}`).join(", ");
  const freeValue = plan.freeSeats.reduce((sum, seat) => sum + seat.fare, 0);

  return (
    <div className="p-5 sm:p-6">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">
        {claim.availableVouchers.length} voucher{claim.availableVouchers.length === 1 ? "" : "s"} available
      </p>
      <h2 className="mb-1 text-lg font-bold text-white">Use vouchers for this group?</h2>
      <p className="mb-4 text-sm leading-relaxed text-white/60">
        You&apos;re paying for {seats.length} passengers. Use up to one voucher per passenger; GCash charges whatever is left.
      </p>

      <ul className="mb-4 max-h-56 space-y-2 overflow-y-auto pr-0.5" aria-label="Your vouchers">
        {claim.availableVouchers.map((voucher) => {
          const isSelected = selected.includes(voucher.id);
          const disabled = !isSelected && (full || wouldBeWasted(voucher));
          return (
            <li key={voucher.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => toggle(voucher)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 ${
                  isSelected ? "border-[#1A5FB4] bg-[#0F2747]" : "border-[#1C3350] bg-[#0B1E33] hover:bg-[#10273F]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    isSelected ? "border-[#1A5FB4] bg-[#1A5FB4] text-white" : "border-[#2A4566] bg-[#071A2E]"
                  }`}
                >
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{voucherLabel(voucher)}</span>
                  <span className="block text-xs text-white/45">{expiryLabel(voucher.expiresAt)}</span>
                </span>
                {disabled && <span className="shrink-0 text-xs text-white/40">{full ? "All seats used" : "Not needed"}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <dl className="mb-5 space-y-2 rounded-xl border border-[#1C3350] bg-[#0B1E33] p-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">Group fare · {seats.length} passengers</dt>
          <dd className="font-medium tabular-nums text-white">{formatCurrency(groupFare)}</dd>
        </div>
        {freeCount > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-white/40">{freeCount} free ride{freeCount === 1 ? "" : "s"} · {freeBreakdown}</dt>
            <dd className="tabular-nums text-white">−{formatCurrency(freeValue)}</dd>
          </div>
        )}
        {plan.discountTotal > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-white/40">Discount</dt>
            <dd className="tabular-nums text-white">−{formatCurrency(plan.discountTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-[#1C3350] pt-2">
          <dt className="font-semibold text-white">{plan.remaining > 0 ? "You pay via GCash" : "Nothing to pay"}</dt>
          <dd className="font-bold tabular-nums text-white">{formatCurrency(plan.remaining)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={() => onUse(selected)}
          className="w-full rounded-xl bg-[#1A5FB4] py-3 text-sm font-bold text-white transition-colors hover:bg-[#164A8F] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          {selected.length === 0
            ? "Select a voucher"
            : `Use ${selected.length} voucher${selected.length === 1 ? "" : "s"} · ${plan.remaining > 0 ? `Pay ${formatCurrency(plan.remaining)}` : "Ride free"}`}
        </button>
        <button
          type="button"
          onClick={onPayInstead}
          className="w-full rounded-xl border border-[#1C3350] bg-[#0B1E33] py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-[#10273F] active:scale-[0.98]"
        >
          Pay {formatCurrency(claim.amount)} with GCash instead
        </button>
      </div>
    </div>
  );
}
