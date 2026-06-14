// components/admin/settings/add-remittance-option-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';

interface AddRemittanceOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddRemittanceOptionModal({ isOpen, onClose }: AddRemittanceOptionModalProps) {
  const [optionName, setOptionName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('New Remittance Option:', optionName);
    alert('Option added! (Check console for data)');
    onClose();
    setOptionName('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-4">Add Remittance Option</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="optionName" className="block text-sm font-medium text-gray-300">Option Name</label>
          <input
            type="text"
            id="optionName"
            value={optionName}
            onChange={(e) => setOptionName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-500 rounded-md text-gray-300 hover:bg-gray-700">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Save Option</button>
        </div>
      </form>
    </Modal>
  );
}