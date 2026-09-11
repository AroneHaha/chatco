// components/admin/ui/confirm-password-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { AlertTriangle, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

interface ConfirmPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the entered password when the admin submits. Throw (or
   *  reject) with an Error to keep the modal open and show the message
   *  inline — e.g. on a wrong-password 422 from the backend. */
  onConfirm: (password: string) => Promise<void>;
  title: string;
  description: string;
  confirmLabel: string;
  /** 'danger' uses red accents for destructive actions (e.g. disabling an
   *  account); 'default' uses amber for sensitive-but-reversible ones. */
  variant?: 'default' | 'danger';
}

const VARIANTS = {
  default: {
    iconBg: 'bg-amber-400/20',
    icon: 'text-amber-400',
    ring: 'focus:ring-amber-400',
    button: 'bg-amber-500 hover:bg-amber-600',
  },
  danger: {
    iconBg: 'bg-red-400/20',
    icon: 'text-red-400',
    ring: 'focus:ring-red-400',
    button: 'bg-red-600 hover:bg-red-700',
  },
};

export function ConfirmPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  variant = 'default',
}: ConfirmPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the modal transitions to open — same
  // conditional-setState-during-render pattern used by DeletePersonnelModal.
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setError(null);
      setIsSubmitting(false);
    }
  }

  const accent = VARIANTS[variant];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect password.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isSubmitting ? () => {} : onClose} maxWidth="max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 ${accent.iconBg} rounded-lg`}>
          <AlertTriangle className={accent.icon} size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Enter your admin password to continue <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="current-password"
              autoFocus
              placeholder="Password"
              className={`block w-full pl-10 pr-10 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${accent.ring} transition-colors disabled:opacity-50`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-1">This prevents accidental changes from a stray click.</p>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[#1E2D45]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !password}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-white font-medium rounded-md transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${accent.button}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Confirming…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
