// components/admin/ui/modal.tsx
import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  rounded?: string;
}

export function Modal({ isOpen, onClose, children, maxWidth = 'max-w-md', rounded = 'rounded-xl' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`relative bg-[#1A2540] border border-[#2A3A55] ${rounded} shadow-2xl w-full ${maxWidth} mx-4 max-h-[90vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/8 transition-colors z-20"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}