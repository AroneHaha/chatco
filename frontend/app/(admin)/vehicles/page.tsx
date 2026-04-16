// app/(admin)/vehicles/page.tsx
'use client';

import { useState } from 'react';
import { VehicleTable } from '@/components/admin/vehicles/vehicle-table';
import { AddVehicleModal } from '@/components/admin/vehicles/add-vehicle-modal';
import { PersonnelTable } from '@/components/admin/vehicles/personnel-table';
import { AddPersonnelModal } from '@/components/admin/vehicles/add-personnel-modal';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Plus, LayoutGrid as TabIcon, Users, Car } from 'lucide-react'; // FIX: Changed Tab to LayoutGrid

export default function VehiclesPage() {
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'vehicles' | 'personnel'>('vehicles');

  const handleOpenVehicleModal = () => setIsVehicleModalOpen(true);
  const handleCloseVehicleModal = () => setIsVehicleModalOpen(false);
  const handleOpenPersonnelModal = () => setIsPersonnelModalOpen(true);
  const handleClosePersonnelModal = () => setIsPersonnelModalOpen(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white">Fleet Management</h1>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <SearchBar
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={setSearchQuery}
            className="flex-1"
          />
          <button
            onClick={activeTab === 'vehicles' ? handleOpenVehicleModal : handleOpenPersonnelModal}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
          >
            <Plus size={20} />
            <span>Add {activeTab === 'vehicles' ? 'Vehicle' : 'Personnel'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b border-white/20">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-lg transition-colors ${
            activeTab === 'vehicles'
              ? 'text-white border-b-2 border-blue-500 bg-blue-500/10'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Car size={20} />
          <span>Vehicles</span>
        </button>
        <button
          onClick={() => setActiveTab('personnel')}
          className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-lg transition-colors ${
            activeTab === 'personnel'
              ? 'text-white border-b-2 border-blue-500 bg-blue-500/10'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Users size={20} />
          <span>Chatco Personnel</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'vehicles' ? (
        <VehicleTable searchQuery={searchQuery} />
      ) : (
        <PersonnelTable searchQuery={searchQuery} />
      )}

      <AddVehicleModal isOpen={isVehicleModalOpen} onClose={handleCloseVehicleModal} />
      <AddPersonnelModal isOpen={isPersonnelModalOpen} onClose={handleClosePersonnelModal} />
    </>
  );
}