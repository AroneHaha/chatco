// components/admin/ui/modal.tsx
import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative backdrop-blur-md bg-gray-900/90 border border-white/20 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}