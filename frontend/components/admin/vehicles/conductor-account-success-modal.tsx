// components/admin/vehicles/conductor-account-success-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { CheckCircle2, Copy, Check, Info } from 'lucide-react';

interface ConductorAccountSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Real credentials returned from the POST /api/admin/conductors response. */
  accountData: {
    id: string;
    first_name: string;
    last_name: string;
    generated_username: string;
    generated_password: string;
  } | null;
}

type CredentialField = 'username' | 'password';

export function ConductorAccountSuccessModal({ isOpen, onClose, accountData }: ConductorAccountSuccessModalProps) {
  const [copiedField, setCopiedField] = useState<CredentialField | null>(null);

  if (!accountData) return null;

  const handleCopy = (text: string, field: CredentialField) => {
    // Only confirm once the clipboard actually has it; a refused write
    // (permissions, insecure context) leaves the value on screen to copy by hand.
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 2000);
    }).catch(() => {});
  };

  const credentials: { field: CredentialField; label: string; value: string }[] = [
    { field: 'username', label: 'Username', value: accountData.generated_username },
    { field: 'password', label: 'Password', value: accountData.generated_password },
  ];

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose}>
      <header className="flex items-start gap-3 border-b border-[#2A3A55] pb-5 pr-8 admin-light:border-[#E2E8F0]">
        <CheckCircle2 size={32} aria-hidden="true" className="shrink-0 text-[#62A0EA] admin-light:text-[#1A5FB4]" />
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-white admin-light:text-slate-900">Conductor account created</h2>
          <p className="mt-1 text-sm leading-relaxed break-words text-slate-400 admin-light:text-slate-500">
            {accountData.first_name} {accountData.last_name} can now sign in on the scanner.
          </p>
        </div>
      </header>

      <section aria-labelledby="scanner-login-heading" className="mt-5">
        <h3 id="scanner-login-heading" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 admin-light:text-slate-500">Scanner login</h3>
        <dl className="mt-2 divide-y divide-[#2A3A55] border-y border-[#2A3A55] admin-light:divide-[#E2E8F0] admin-light:border-[#E2E8F0]">
          {credentials.map(({ field, label, value }) => (
            <div key={field} className="flex items-center justify-between gap-3 py-3">
              <dt className="shrink-0 text-sm text-slate-400 admin-light:text-slate-500">{label}</dt>
              <dd className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 font-mono text-base font-semibold tracking-wide break-all text-white admin-light:text-slate-900">{value}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(value, field)}
                  aria-label={copiedField === field ? `${label} copied` : `Copy ${label.toLowerCase()}`}
                  title={`Copy ${label.toLowerCase()}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#2A3A55] bg-[#131C2E] text-slate-400 transition-colors hover:text-white admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:text-slate-500 admin-light:hover:text-slate-900"
                >
                  {copiedField === field ? <Check size={16} className="text-[#62A0EA] admin-light:text-[#1A5FB4]" /> : <Copy size={16} />}
                </button>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
        <Info size={15} aria-hidden="true" className="mt-px shrink-0" />
        Write these down or send them to the conductor securely. They need them to sign in on the scanning device.
      </p>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 min-h-11 w-full rounded-md border border-[#62A0EA] bg-[#62A0EA] px-4 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]"
      >
        Done
      </button>
    </Modal>
  );
}
