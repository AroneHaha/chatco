// app/(admin)/settings/remittance-options/page.tsx
'use client';

import { useState } from 'react';
import { RemittanceOptionsTable } from '@/components/admin/settings/remittance-options-table';
import { AddRemittanceOptionModal } from '@/components/admin/settings/add-remittance-option-modal';
import { Plus } from 'lucide-react';

export default function RemittanceOptionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Remittance Options</h1>
        <button
          onClick={handleOpenModal}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          <span>Add New Option</span>
        </button>
      </div>

      <RemittanceOptionsTable />
      <AddRemittanceOptionModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
}