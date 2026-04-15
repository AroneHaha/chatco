// app/(admin)/lost-found/page.tsx
'use client';

import { useState } from 'react';
import { LostFoundTable } from '@/components/admin/lost-found/lost-found-table';
import { AddLostFoundModal } from '@/components/admin/lost-found/add-lost-found-modal';
import { Plus } from 'lucide-react';

export default function LostFoundPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Lost & Found Management</h1>
        <button
          onClick={handleOpenModal}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          <span>Add Item</span>
        </button>
      </div>

      {/* Lost & Found Table */}
      <LostFoundTable />

      {/* Add Item Modal */}
      <AddLostFoundModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
}