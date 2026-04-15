// app/(admin)/vehicles/page.tsx
'use client';

import { useState } from 'react';
import { VehicleTable } from '@/components/admin/vehicles/vehicle-table';
import { AddVehicleModal } from '@/components/admin/vehicles/add-vehicle-modal';
import { Plus } from 'lucide-react';

export default function VehiclesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Vehicles</h1> {/* FIX: Changed color to white */}
        <button
          onClick={handleOpenModal}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={20} />
          <span>Add Vehicle</span>
        </button>
      </div>

      <VehicleTable />

      {/* Add Vehicle Modal */}
      <AddVehicleModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}