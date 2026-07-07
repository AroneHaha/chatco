// components/admin/settings/add-remittance-option-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';

interface AddRemittanceOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AddRemittanceOptionModal({ isOpen, onClose, onSaved }: AddRemittanceOptionModalProps) {
  const [optionName, setOptionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optionName.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/remittance-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_name: optionName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create option');
      setOptionName('');
      onClose();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create option');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-4">Add Remittance Option</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md"><p className="text-sm text-red-400">{error}</p></div>}
        <div>
          <label htmlFor="optionName" className="block text-sm font-medium text-gray-300">Option Name</label>
          <input
            type="text"
            id="optionName"
            value={optionName}
            onChange={(e) => setOptionName(e.target.value)}
            required
            disabled={isSaving}
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 border border-gray-500 rounded-md text-gray-300 hover:bg-gray-700 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Option'}</button>
        </div>
      </form>
    </Modal>
  );
}
