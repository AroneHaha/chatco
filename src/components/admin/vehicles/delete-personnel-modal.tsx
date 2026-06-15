// components/admin/vehicles/delete-personnel-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeletePersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { id: number; reason: string; terminationType: string }) => void;
  personnelData: { id: number; name: string; role: string } | null;
}

export function DeletePersonnelModal({ isOpen, onClose, onConfirm, personnelData }: DeletePersonnelModalProps) {
  const [terminationType, setTerminationType] = useState('Terminated');
  const [reason, setReason] = useState('');

  // Reset form when modal opens or data changes
  useEffect(() => {
    if (isOpen) {
      setTerminationType('Terminated');
      setReason('');
    }
  }, [isOpen, personnelData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personnelData || !reason.trim()) return;

    onConfirm({
      id: personnelData.id,
      reason: reason.trim(),
      terminationType,
    });
    
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-400/20 rounded-lg">
          <AlertTriangle className="text-red-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Remove Personnel</h2>
          <p className="text-sm text-slate-400">This action will deactivate the personnel account.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Warning Box */}
        <div className="p-4 bg-red-400/5 border border-red-400/20 rounded-md">
          <p className="text-sm text-slate-300">
            You are about to terminate <span className="font-bold text-white">{personnelData?.name}</span> 
            ({personnelData?.role}). Please provide the necessary details below.
          </p>
        </div>

        {/* Termination Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Termination Type <span className="text-red-400">*</span></label>
          <select
            value={terminationType}
            onChange={(e) => setTerminationType(e.target.value)}
            className="block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-red-400 transition-colors [color-scheme:dark]"
          >
            <option value="Terminated" className="bg-gray-800">Terminated</option>
            <option value="Resigned" className="bg-gray-800">Resigned</option>
          </select>
        </div>

        {/* Reason Textarea */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Reason for Removal <span className="text-red-400">*</span></label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={4}
            placeholder="e.g., Repeated policy violations, Gross negligence, Health reasons..."
            className="block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-400 transition-colors resize-none leading-relaxed"
          />
          <p className="text-xs text-slate-600 mt-1">This will be recorded in the Records & History tab.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[#1E2D45]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors active:scale-[0.98]"
          >
            <Trash2 size={16} />
            Confirm Removal
          </button>
        </div>
      </form>
    </Modal>
  );
}