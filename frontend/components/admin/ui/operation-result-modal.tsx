"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/admin/ui/modal";

interface OperationResultModalProps {
  isOpen: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
}

export function OperationResultModal({ isOpen, type, title, message, onClose }: OperationResultModalProps) {
  const success = type === "success";

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center px-2 pt-2 text-center" role={success ? "status" : "alert"}>
        {/* The icon says which outcome it was; Done stays the same blue for both
            so the button itself isn't colour-coded. */}
        {success
          ? <CheckCircle2 size={44} aria-hidden="true" className="text-[#62A0EA] admin-light:text-[#1A5FB4]" />
          : <AlertCircle size={44} aria-hidden="true" className="text-red-400 admin-light:text-red-600" />}
        <h2 className="mt-4 text-xl font-semibold tracking-tight break-words text-white admin-light:text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed break-words text-slate-400 admin-light:text-slate-500">{message}</p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-6 min-h-11 w-full rounded-md border border-[#62A0EA] bg-[#62A0EA] px-4 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
