// components/admin/vehicles/conductor-account-success-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { CheckCircle, User, KeyRound, Copy, Check } from 'lucide-react';

interface ConductorAccountSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountData: {
    firstName: string;
    lastName: string;
    birthday: string;
    route: string;
  } | null;
}

export function ConductorAccountSuccessModal({ isOpen, onClose, accountData }: ConductorAccountSuccessModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!accountData) return null;

  // Format Birthday from YYYY-MM-DD to MMDDYYYY
  const formatBirthday = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}${day}${year}`;
  };

  // Generate Username: firstnameinitial.wholelastname (e.g., j.delacruz)
  const generatedUsername = `${accountData.firstName.charAt(0).toLowerCase()}.${accountData.lastName.toLowerCase().replace(/\s/g, '')}`;

  // Generate Password: firstname.birthdate (e.g., juan.05142000)
  const generatedPassword = `${accountData.firstName.toLowerCase()}.${formatBirthday(accountData.birthday)}`;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000); // Reset icon after 2 seconds
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center space-y-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
            <div className="relative bg-green-500/20 p-4 rounded-full">
              <CheckCircle className="text-green-400" size={48} />
            </div>
          </div>
        </div>

        {/* Header Text */}
        <div>
          <h2 className="text-2xl font-bold text-white">Account Created Successfully</h2>
          <p className="text-sm text-gray-400 mt-1">
            Conductor account for <span className="text-white font-medium">{accountData.firstName} {accountData.lastName}</span>
          </p>
        </div>

        {/* Credentials Card */}
        <div className="bg-white/[0.05] border border-white/10 rounded-xl p-5 space-y-4 text-left">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Scanner Login Credentials</p>
          
          {/* Username Field */}
          <div className="flex items-center justify-between bg-white/[0.05] rounded-lg p-3">
            <div className="flex items-center gap-3">
              <User size={18} className="text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-white/30 uppercase">Username</p>
                <p className="text-lg font-mono font-bold text-white tracking-wide">{generatedUsername}</p>
              </div>
            </div>
            <button
              onClick={() => handleCopy(generatedUsername, 'username')}
              className="p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Copy username"
            >
              {copiedField === 'username' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>

          {/* Password Field */}
          <div className="flex items-center justify-between bg-white/[0.05] rounded-lg p-3">
            <div className="flex items-center gap-3">
              <KeyRound size={18} className="text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-white/30 uppercase">Password</p>
                <p className="text-lg font-mono font-bold text-white tracking-wide">{generatedPassword}</p>
              </div>
            </div>
            <button
              onClick={() => handleCopy(generatedPassword, 'password')}
              className="p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Copy password"
            >
              {copiedField === 'password' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Warning Note */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-left flex gap-3">
          <KeyRound size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-200/70">
            Please ensure these credentials are written down or sent securely to the conductor. They will need this to log into the scanning device.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}