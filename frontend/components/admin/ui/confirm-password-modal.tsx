// components/admin/ui/confirm-password-modal.tsx
'use client';

import { useId, useState } from 'react';
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
  /** 'danger' uses red for destructive actions (e.g. disabling an account);
   *  'default' uses the normal primary button for sensitive-but-reversible ones. */
  variant?: 'default' | 'danger';
}

const VARIANTS = {
  default: {
    kicker: 'Confirm action',
    kickerTone: 'text-slate-400 admin-light:text-slate-500',
    button: 'border-[#62A0EA] bg-[#62A0EA] text-[#0B1120] hover:bg-[#85B6F0] admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]',
  },
  danger: {
    kicker: 'Permanent action',
    kickerTone: 'text-red-400 admin-light:text-red-600',
    button: 'border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700',
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
  const fieldId = useId();

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
    <Modal adminThemed isOpen={isOpen} onClose={isSubmitting ? () => {} : onClose} maxWidth="max-w-md">
      <header className="border-b border-[#2A3A55] pb-5 pr-8 admin-light:border-[#E2E8F0]">
        <p className={`text-[11px] font-semibold uppercase tracking-widest ${accent.kickerTone}`}>{accent.kicker}</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight break-words text-white sm:text-2xl admin-light:text-slate-900">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400 admin-light:text-slate-500">{description}</p>
      </header>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div>
          <label htmlFor={fieldId} className="block text-[11px] font-semibold uppercase tracking-widest text-slate-400 admin-light:text-slate-500">
            Admin password
          </label>
          <div className="relative mt-2">
            <Lock size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id={fieldId}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              autoComplete="current-password"
              autoFocus
              placeholder="Password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${fieldId}-help ${fieldId}-error` : `${fieldId}-help`}
              className={`block min-h-11 w-full rounded-md border bg-[#131C2E] pl-10 pr-11 text-white placeholder-slate-500 transition-colors focus:border-[#62A0EA] focus:outline-none focus:ring-2 focus:ring-[#62A0EA]/15 disabled:opacity-50 admin-light:bg-[#F8FAFC] admin-light:text-slate-900 admin-light:placeholder-slate-400 admin-light:focus:border-[#1A5FB4] admin-light:focus:ring-[#1A5FB4]/10 ${error ? 'border-red-500 admin-light:border-red-500' : 'border-[#2A3A55] admin-light:border-[#CBD5E1]'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-slate-500 hover:text-slate-300 admin-light:hover:text-slate-700"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && (
            <p id={`${fieldId}-error`} role="alert" className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-red-400 admin-light:text-red-600">
              <AlertTriangle size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <p id={`${fieldId}-help`} className="mt-2 text-xs text-slate-500 admin-light:text-slate-500">This prevents accidental changes from a stray click.</p>
        </div>

        <div className="flex flex-col-reverse gap-2 min-[380px]:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-11 flex-1 rounded-md border border-[#2A3A55] bg-[#131C2E] px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-[#0E1628] disabled:cursor-not-allowed disabled:text-slate-500 admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !password}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${accent.button}`}
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
