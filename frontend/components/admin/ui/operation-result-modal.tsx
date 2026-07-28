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
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center px-2 py-4 text-center">
        <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${success ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
          {success ? <CheckCircle2 size={34} /> : <AlertCircle size={34} />}
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{message}</p>
        <button type="button" onClick={onClose} className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${success ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
          Done
        </button>
      </div>
    </Modal>
  );
}
