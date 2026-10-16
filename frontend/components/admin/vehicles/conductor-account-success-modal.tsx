// components/admin/vehicles/conductor-account-success-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { CheckCircle, User, KeyRound, Copy, Check } from 'lucide-react';

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

export function ConductorAccountSuccessModal({ isOpen, onClose, accountData }: ConductorAccountSuccessModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!accountData) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose}>
      <div className="text-center space-y-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-sky-400/20 rounded-full animate-ping" />
            <div className="relative bg-sky-400/20 p-4 rounded-full">
              <CheckCircle className="text-sky-400 admin-light:text-sky-700" size={48} />
            </div>
          </div>
        </div>

        {/* Header Text */}
        <div>
          <h2 className="text-2xl font-bold text-white admin-light:text-slate-900">Account Created Successfully</h2>
          <p className="text-sm text-slate-400 admin-light:text-slate-500 mt-1">
            Conductor account for <span className="text-white admin-light:text-slate-900 font-medium">{accountData.first_name} {accountData.last_name}</span>
          </p>
        </div>

        {/* Credentials Card */}
        <div className="bg-[#0E1628] admin-light:bg-[#F1F5F9] border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-md p-5 space-y-4 text-left">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scanner Login Credentials</p>

          {/* Username Field */}
          <div className="flex items-center justify-between bg-[#0B1120] admin-light:bg-[#F1F5F9] rounded-md p-3">
            <div className="flex items-center gap-3">
              <User size={18} className="text-[#62A0EA] admin-light:text-[#1A5FB4] flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase">Username</p>
                <p className="text-lg font-mono font-bold text-white admin-light:text-slate-900 tracking-wide">{accountData.generated_username}</p>
              </div>
            </div>
            <button
              onClick={() => handleCopy(accountData.generated_username, 'username')}
              className="p-2 text-slate-500 hover:text-white admin-light:hover:text-slate-900 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] rounded-md transition-colors"
              title="Copy username"
            >
              {copiedField === 'username' ? <Check size={16} className="text-sky-400 admin-light:text-sky-700" /> : <Copy size={16} />}
            </button>
          </div>

          {/* Password Field */}
          <div className="flex items-center justify-between bg-[#0B1120] admin-light:bg-[#F1F5F9] rounded-md p-3">
            <div className="flex items-center gap-3">
              <KeyRound size={18} className="text-amber-400 admin-light:text-amber-700 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 uppercase">Password</p>
                <p className="text-lg font-mono font-bold text-white admin-light:text-slate-900 tracking-wide">{accountData.generated_password}</p>
              </div>
            </div>
            <button
              onClick={() => handleCopy(accountData.generated_password, 'password')}
              className="p-2 text-slate-500 hover:text-white admin-light:hover:text-slate-900 hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] rounded-md transition-colors"
              title="Copy password"
            >
              {copiedField === 'password' ? <Check size={16} className="text-sky-400 admin-light:text-sky-700" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Warning Note */}
        <div className="bg-amber-400/10 border border-amber-400/20 rounded-md p-3 text-left flex gap-3">
          <KeyRound size={16} className="text-amber-400 admin-light:text-amber-700 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-200/70 admin-light:text-amber-700">
            Please ensure these credentials are written down or sent securely to the conductor. They will need this to log into the scanning device.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white font-medium rounded-md hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] transition-colors"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
