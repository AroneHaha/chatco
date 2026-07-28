"use client";

import { useState } from "react";
import { LoaderCircle, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/admin/ui/modal";
import type { ActiveUser } from "@/app/(admin)/users/data/users-data";
import type { SuspendUserInput } from "@/lib/admin/services/user.service";

interface SuspensionModalProps {
  user: ActiveUser | null;
  isOpen: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onSuspend: (input: SuspendUserInput) => Promise<void>;
  onUnsuspend: () => Promise<void>;
}

const REASONS: Array<{ value: SuspendUserInput["reasonCode"]; label: string }> = [
  { value: "POLICY_VIOLATION", label: "Policy violation" },
  { value: "FRAUD_SUSPECTED", label: "Suspected fraud" },
  { value: "SAFETY_CONCERN", label: "Safety concern" },
  { value: "ABUSIVE_BEHAVIOR", label: "Abusive behavior" },
  { value: "PAYMENT_ISSUE", label: "Payment issue" },
  { value: "OTHER", label: "Other" },
];

export function SuspensionModal({
  user,
  isOpen,
  isProcessing,
  onClose,
  onSuspend,
  onUnsuspend,
}: SuspensionModalProps) {
  const [reasonCode, setReasonCode] = useState<SuspendUserInput["reasonCode"]>("POLICY_VIOLATION");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<1 | 3 | 7 | 14 | 30 | 90>(7);
  const [isPermanent, setIsPermanent] = useState(false);

  if (!user) return null;
  const suspended = user.status === "Suspended";

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!isProcessing) onClose(); }}>
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-400/10 p-3 text-amber-400">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {suspended ? "Reactivate account" : "Suspend account"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{user.name} - {user.email}</p>
          </div>
        </div>

        {suspended ? (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-sm">
            <p className="font-medium text-amber-300">
              {user.suspension?.isPermanent
                ? "Permanently suspended"
                : user.suspension?.endsAt
                  ? `Suspended until ${new Date(user.suspension.endsAt).toLocaleString()}`
                  : "Suspended"}
            </p>
            <p className="mt-2 text-slate-300">{user.suspension?.reason ?? "No reason recorded for this legacy suspension."}</p>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Reason category</span>
              <select
                value={reasonCode}
                onChange={(event) => setReasonCode(event.target.value as SuspendUserInput["reasonCode"])}
                disabled={isProcessing}
                className="w-full rounded-lg border border-[#1E2D45] bg-[#0E1628] px-3 py-2.5 text-white [color-scheme:dark]"
              >
                {REASONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Details</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={isProcessing}
                rows={3}
                maxLength={500}
                placeholder="Explain why this account is being suspended."
                className="w-full resize-none rounded-lg border border-[#1E2D45] bg-[#0E1628] px-3 py-2.5 text-white placeholder:text-slate-600"
              />
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={isPermanent}
                onChange={(event) => setIsPermanent(event.target.checked)}
                disabled={isProcessing}
                className="h-4 w-4 rounded border-slate-600"
              />
              Permanently disable this account
            </label>

            {!isPermanent && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Suspension duration</span>
                <select
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value) as typeof duration)}
                  disabled={isProcessing}
                  className="w-full rounded-lg border border-[#1E2D45] bg-[#0E1628] px-3 py-2.5 text-white [color-scheme:dark]"
                >
                  {[1, 3, 7, 14, 30, 90].map(days => <option key={days} value={days}>{days} day{days === 1 ? "" : "s"}</option>)}
                </select>
              </label>
            )}
          </>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg border border-[#1E2D45] px-4 py-2 text-sm text-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing || (!suspended && reason.trim().length < 5)}
            onClick={() => suspended
              ? void onUnsuspend()
              : void onSuspend({ reasonCode, reason: reason.trim(), isPermanent, durationDays: isPermanent ? undefined : duration })}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
              suspended ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isProcessing && <LoaderCircle size={16} className="animate-spin" />}
            {suspended ? "Reactivate account" : "Confirm suspension"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
