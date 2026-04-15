// app/(admin)/lost-found/page.tsx
'use client';

import { useState } from 'react';
import { LostFoundTable } from '@/components/admin/lost-found/lost-found-table';
import { AddLostFoundModal } from '@/components/admin/lost-found/add-lost-found-modal';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Plus } from 'lucide-react';

export default function LostFoundPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white">Lost & Found Management</h1>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <SearchBar
            placeholder="Search items..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="flex-1"
          />
          <button
            onClick={handleOpenModal}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
          >
            <Plus size={20} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      <LostFoundTable searchQuery={searchQuery} />

      <AddLostFoundModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
}