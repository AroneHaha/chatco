"use client";

import { useState } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { Modal } from "@/components/admin/ui/modal";
import { UserAvatar } from "@/components/admin/ui/user-avatar";
import type { ActiveUser } from "@/app/(admin)/users/data/users-data";
import type { SuspendUserInput } from "@/lib/admin/services/user.service";

interface SuspensionModalProps {
  user: ActiveUser | null;
  isOpen: boolean;
  isProcessing: boolean;
  /** Server-side rejection (e.g. "You cannot suspend your own account."). */
  error?: string | null;
  onClose: () => void;
  onSuspend: (input: SuspendUserInput) => Promise<void>;
  onUnsuspend: () => Promise<void>;
}

const REASONS: Array<{ value: SuspendUserInput["reasonCode"]; label: string }> = [
  { value: "POLICY_VIOLATION", label: "Policy violation" },
  { value: "FRAUD_SUSPECTED", label: "Suspected fraud" },
  { value: "SAFETY_CONCERN", label: "Safety concern" },
  { value: "INAPPROPRIATE_PROFILE_PHOTO", label: "Inappropriate profile picture" },
  { value: "PAYMENT_ISSUE", label: "Payment issue" },
  { value: "OTHER", label: "Other" },
];

/** Codes no longer offered but still stored on older suspensions. */
const LEGACY_REASON_LABELS: Record<string, string> = {
  ABUSIVE_BEHAVIOR: "Abusive behavior",
};

type DurationDays = NonNullable<SuspendUserInput["durationDays"]>;
const DURATIONS: DurationDays[] = [1, 3, 7, 14, 30, 90];
const REASON_MAX = 500;
const REASON_MIN = 5;

const DATE_TIME: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" };

const LABEL = "mb-3 block text-[11px] font-semibold uppercase tracking-widest text-slate-400 admin-light:text-slate-500";
// Duration segments: a real (visually hidden) radio drives the state, the
// label carries the visible choice.
const CHOICE = "flex min-h-11 cursor-pointer items-center rounded-md border px-3 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#62A0EA] admin-light:has-[:focus-visible]:outline-[#1A5FB4] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";
const CHOICE_ON = "border-[#62A0EA] bg-[#62A0EA]/12 text-white admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4]/8 admin-light:text-slate-900";
const CHOICE_OFF = "border-[#2A3A55] bg-[#131C2E] text-slate-300 hover:border-[#3A4D6E] hover:text-white admin-light:border-[#E2E8F0] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:border-[#CBD5E1] admin-light:hover:text-slate-900";

export function SuspensionModal({
  user,
  isOpen,
  isProcessing,
  error = null,
  onClose,
  onSuspend,
  onUnsuspend,
}: SuspensionModalProps) {
  const [reasonCode, setReasonCode] = useState<SuspendUserInput["reasonCode"]>("POLICY_VIOLATION");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<DurationDays>(7);
  const [isPermanent, setIsPermanent] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  // The page remounts this modal per user (keyed by id), so this is the open time.
  const [openedAt] = useState(() => Date.now());

  if (!user) return null;
  const suspended = user.status === "Suspended";
  const isOther = reasonCode === "OTHER";
  const reasonLabel = REASONS.find(option => option.value === reasonCode)?.label ?? "Other";

  // The backend requires a 5–500 character `reason` on every suspension.
  // Only "Other" asks for typed text; the fixed categories send their own
  // label, which already says why. The 5-character floor is checked on click
  // so the admin sees why nothing happened instead of a disabled button.
  const handleConfirm = () => {
    if (suspended) {
      void onUnsuspend();
      return;
    }
    if (isOther && reason.trim().length < REASON_MIN) {
      setReasonError(`The reason must be at least ${REASON_MIN} characters.`);
      return;
    }
    setReasonError(null);
    void onSuspend({ reasonCode, reason: isOther ? reason.trim() : reasonLabel, isPermanent, durationDays: isPermanent ? undefined : duration });
  };

  // Mirrors the backend's now()->addDays(duration_days); a preview, so the
  // minutes between opening the modal and confirming don't matter.
  const returnsAt = new Date(openedAt + duration * 86_400_000).toLocaleString("en-US", DATE_TIME);
  const current = user.suspension;
  const currentReasonLabel = current
    ? REASONS.find(option => option.value === current.reasonCode)?.label ?? LEGACY_REASON_LABELS[current.reasonCode] ?? "Other"
    : null;
  // Category-only suspensions store the label as the reason; don't print it twice.
  const currentDetails = current?.reason && current.reason !== currentReasonLabel ? current.reason : null;

  return (
    <Modal adminThemed maxWidth="max-w-lg" isOpen={isOpen} onClose={() => { if (!isProcessing) onClose(); }}>
      <div className="grid gap-6">
        <header className="flex min-w-0 items-center gap-4 border-b border-[#2A3A55] pb-5 pr-8 admin-light:border-[#E2E8F0]">
          <UserAvatar src={user._raw?.profileImageUrl} alt={`Profile photo of ${user.name}`} className="h-12 w-12" iconClassName="h-5 w-5" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug text-white admin-light:text-slate-900">
              {suspended ? "Reactivate account" : "Suspend account"}
            </h2>
            <p className="mt-0.5 text-sm font-medium text-slate-200 wrap-anywhere admin-light:text-slate-700">{user.name}</p>
            <p className="text-xs text-slate-400 wrap-anywhere admin-light:text-slate-500">{user.email}</p>
          </div>
        </header>

        {suspended ? (
          <section>
            <h3 className={LABEL}>Current suspension</h3>
            <dl className="grid gap-3 text-sm [&>div]:grid [&>div]:grid-cols-[96px_minmax(0,1fr)] [&>div]:gap-3 [&_dt]:text-xs [&_dt]:text-slate-400 admin-light:[&_dt]:text-slate-500 [&_dd]:font-medium [&_dd]:text-slate-100 admin-light:[&_dd]:text-slate-900 [&_dd]:wrap-anywhere">
              {currentReasonLabel && <div><dt>Reason</dt><dd>{currentReasonLabel}</dd></div>}
              {currentDetails
                ? <div><dt>Details</dt><dd>{currentDetails}</dd></div>
                : !current?.reason && <div><dt>Details</dt><dd>No reason recorded for this legacy suspension.</dd></div>}
              {current?.startsAt && <div><dt>Since</dt><dd>{new Date(current.startsAt).toLocaleString("en-US", DATE_TIME)}</dd></div>}
              <div>
                <dt>Ends</dt>
                <dd>{current?.isPermanent ? "No end date (permanent)" : current?.endsAt ? new Date(current.endsAt).toLocaleString("en-US", DATE_TIME) : "Not set"}</dd>
              </div>
            </dl>
            <p className="mt-5 text-sm text-slate-300 admin-light:text-slate-600">Reactivating lifts this suspension now.</p>
          </section>
        ) : (
          <>
            <div>
              <label htmlFor="suspension-reason-code" className={LABEL}>Reason</label>
              <div className="relative">
                <select
                  id="suspension-reason-code"
                  value={reasonCode}
                  onChange={(event) => { setReasonCode(event.target.value as SuspendUserInput["reasonCode"]); setReasonError(null); }}
                  disabled={isProcessing}
                  className="min-h-11 w-full cursor-pointer appearance-none rounded-md border border-[#2A3A55] bg-[#0E1628] py-2.5 pl-3 pr-10 text-sm font-medium text-white outline-none transition-colors scheme-dark hover:border-[#3A4D6E] focus:border-[#62A0EA] disabled:cursor-not-allowed disabled:opacity-60 admin-light:border-[#E2E8F0] admin-light:bg-[#F8FAFC] admin-light:text-slate-900 admin-light:scheme-light admin-light:hover:border-[#CBD5E1] admin-light:focus:border-[#1A5FB4]"
                >
                  {REASONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 admin-light:text-slate-500" />
              </div>

              {isOther && (
                <div className="mt-4">
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <label htmlFor="suspension-reason-details" className="text-xs font-medium text-slate-300 admin-light:text-slate-700">Describe the reason</label>
                    <span className="text-[11px] tabular-nums text-slate-500 admin-light:text-slate-400" aria-hidden="true">{reason.length}/{REASON_MAX}</span>
                  </div>
                  <textarea
                    id="suspension-reason-details"
                    value={reason}
                    onChange={(event) => { setReason(event.target.value); setReasonError(null); }}
                    disabled={isProcessing}
                    rows={3}
                    maxLength={REASON_MAX}
                    autoFocus
                    placeholder="Explain why this account is being suspended."
                    aria-invalid={Boolean(reasonError)}
                    aria-describedby={reasonError ? "suspension-reason-error" : "suspension-reason-help"}
                    className={`w-full resize-none rounded-md border bg-[#0E1628] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[#62A0EA] disabled:opacity-60 admin-light:bg-[#F8FAFC] admin-light:text-slate-900 admin-light:placeholder:text-slate-400 admin-light:focus:border-[#1A5FB4] ${
                      reasonError ? "border-red-500/60 admin-light:border-red-500" : "border-[#2A3A55] admin-light:border-[#E2E8F0]"
                    }`}
                  />
                  {reasonError
                    ? <p id="suspension-reason-error" className="mt-1.5 text-xs text-red-400 admin-light:text-red-600">{reasonError}</p>
                    : <p id="suspension-reason-help" className="mt-1.5 text-xs text-slate-500">At least {REASON_MIN} characters.</p>}
                </div>
              )}
            </div>

            <fieldset disabled={isProcessing} className="min-w-0">
              <legend className={LABEL}>Duration</legend>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map(days => {
                  const selected = !isPermanent && duration === days;
                  return (
                    <label key={days} className={`${CHOICE} justify-center ${selected ? CHOICE_ON : CHOICE_OFF}`}>
                      <input type="radio" name="suspension-duration" value={days} checked={selected} onChange={() => { setDuration(days); setIsPermanent(false); }} className="sr-only" />
                      {days} {days === 1 ? "day" : "days"}
                    </label>
                  );
                })}
                <label className={`${CHOICE} col-span-2 justify-center ${isPermanent ? "border-red-500/70 bg-red-500/10 text-red-300 admin-light:border-red-500 admin-light:bg-red-50 admin-light:text-red-700" : CHOICE_OFF}`}>
                  <input type="radio" name="suspension-duration" value="permanent" checked={isPermanent} onChange={() => setIsPermanent(true)} className="sr-only" />
                  Permanent
                </label>
              </div>
              <p className="mt-4 text-sm text-slate-400 admin-light:text-slate-500" aria-live="polite">
                {isPermanent
                  ? <>No end date. Access stays off until an admin reactivates the account.</>
                  : <>Access returns <span className="font-semibold text-white admin-light:text-slate-900">{returnsAt}</span></>}
              </p>
            </fieldset>
          </>
        )}

        {error && (
          <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-400 admin-light:text-red-600">{error}</p>
          </div>
        )}

        <footer className="flex flex-col-reverse gap-2 border-t border-[#2A3A55] pt-5 sm:flex-row sm:justify-end admin-light:border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="min-h-11 rounded-md border border-[#2A3A55] bg-[#131C2E] px-5 text-sm font-medium text-slate-200 transition-colors hover:bg-[#0E1628] active:scale-[.98] disabled:opacity-50 admin-light:border-[#E2E8F0] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleConfirm}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white transition-colors active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 ${
              suspended ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isProcessing && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
            {suspended ? "Reactivate account" : isPermanent ? "Suspend permanently" : "Suspend account"}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
