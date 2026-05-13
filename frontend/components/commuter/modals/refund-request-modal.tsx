"use client";

import { useState } from "react";
import {
  submitRefundRequest,
  REFUND_REASONS,
  getRefundReasonLabel,
  type RefundReason,
  type RefundPaymentMethod,
} from "@/lib/refund-service";
import { formatCurrency } from "@/lib/fare-calculator";
import { getPaymentHistory, type GCashPaymentIntent } from "@/lib/gcash-payment";
import { useEffect } from "react";

interface RefundRequestModalProps {
  commuterId: string;
  commuterName: string;
  onClose: () => void;
}

export default function RefundRequestModal({
  commuterId,
  commuterName,
  onClose,
}: RefundRequestModalProps) {
  const [transactions, setTransactions] = useState<GCashPaymentIntent[]>([]);
  const [selectedTransaction, setSelectedTransaction] =
    useState<GCashPaymentIntent | null>(null);
  const [reason, setReason] = useState<RefundReason>("ENGINE_BREAKDOWN");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    getPaymentHistory(commuterId).then(setTransactions);
  }, [commuterId]);

  const paidTransactions = transactions.filter((t) => t.status === "paid");

  const handleSubmit = async () => {
    if (!selectedTransaction) return;
    setIsSubmitting(true);
    try {
      await submitRefundRequest({
        transactionId: selectedTransaction.id,
        commuterId,
        commuterName,
        amount: selectedTransaction.amount,
        reason,
        description,
        paymentMethod: selectedTransaction.paymentMethod as RefundPaymentMethod,
      });
      setIsSuccess(true);
    } catch {
      alert("Failed to submit refund request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Success State ────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full sm:max-w-sm bg-[#071A2E] rounded-2xl border border-white/10 shadow-2xl">
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Refund Request Submitted
            </h2>
            <p className="text-sm text-white/40 mb-6">
              Your request has been sent for review. For GCash payments, the
              refund will be reversed to your GCash account. For cash payments,
              the conductor will process it manually.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#071A2E] sm:rounded-2xl rounded-t-2xl border border-white/10 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Request Refund</h2>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-xs text-white/40 mt-1">
            Select a paid transaction and the reason for your refund.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Transaction Selection */}
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">
              Select Transaction
            </label>
            {paidTransactions.length === 0 ? (
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-sm text-white/30">
                  No paid transactions found
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {paidTransactions.map((txn) => (
                  <button
                    key={txn.id}
                    onClick={() => setSelectedTransaction(txn)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selectedTransaction?.id === txn.id
                        ? "border-[#62A0EA] bg-[#62A0EA]/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Point {txn.pickupPoint} → Point {txn.dropoffPoint}
                        </p>
                        <p className="text-[10px] text-white/30 font-mono">
                          {txn.id}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">
                          {formatCurrency(txn.amount)}
                        </p>
                        <p className="text-[10px] text-[#62A0EA]">GCash</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refund Reason */}
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">
              Reason
            </label>
            <div className="space-y-2">
              {REFUND_REASONS.map((r: { value: RefundReason; label: string; description: string }) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    reason === r.value
                      ? "border-[#FF6D3A] bg-[#FF6D3A]/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="text-sm font-medium text-white">{r.label}</p>
                  <p className="text-[10px] text-white/30">{r.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 block">
              Additional Details (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA] resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="p-5 border-t border-white/10">
          <button
            onClick={handleSubmit}
            disabled={!selectedTransaction || isSubmitting}
            className="w-full py-3.5 rounded-xl bg-[#FF6D3A] hover:bg-[#e55a2b] text-white font-bold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Refund Request"}
          </button>
        </div>
      </div>
    </div>
  );
}