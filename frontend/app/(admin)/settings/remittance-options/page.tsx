// app/(admin)/settings/remittance-options/page.tsx
'use client';

import { useState } from 'react';
import { RemittanceOptionsTable } from '@/components/admin/settings/remittance-options-table';
import { AddRemittanceOptionModal } from '@/components/admin/settings/add-remittance-option-modal';
import BackButton from '@/components/admin/ui/back-button';
import { Plus } from 'lucide-react';

export default function RemittanceOptionsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="pt-2"><BackButton href="/settings" /></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Remittance Options</h1>
          <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95">
            <Plus size={18} /><span>Add New Option</span>
          </button>
        </div>
        <RemittanceOptionsTable />
        <AddRemittanceOptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </div>
  );
}