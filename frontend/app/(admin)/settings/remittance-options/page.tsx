// app/(admin)/settings/remittance-options/page.tsx
'use client';

import { useState } from 'react';
import { RemittanceOptionsTable } from '@/components/admin/settings/remittance-options-table';
import { AddRemittanceOptionModal } from '@/components/admin/settings/add-remittance-option-modal';
import BackButton from '@/components/admin/ui/back-button';
import { Plus } from 'lucide-react';

export default function RemittanceOptionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        
        {/* Left-aligned Back Button */}
        <div className="pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Remittance Options</h1>
        </div>

        {/* Mobile-Friendly Add Button */}
        <div className="flex justify-center sm:justify-end">
          <button
            onClick={handleOpenModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors active:scale-95"
          >
            <Plus size={18} />
            <span>Add New Option</span>
          </button>
        </div>

        <RemittanceOptionsTable />
        <AddRemittanceOptionModal isOpen={isModalOpen} onClose={handleCloseModal} />

      </div>
    </div>
  );
}