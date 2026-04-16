// app/(admin)/vehicles/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { VehicleTable } from '@/components/admin/vehicles/vehicle-table';
import { AddVehicleModal } from '@/components/admin/vehicles/add-vehicle-modal';
import { EditVehicleModal } from '@/components/admin/vehicles/edit-vehicle-modal';
import { PersonnelTable } from '@/components/admin/vehicles/personnel-table';
import { AddPersonnelModal } from '@/components/admin/vehicles/add-personnel-modal';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Plus, Users, Car } from 'lucide-react';

// Mock Personnel Data (In production, this comes from Laravel)
const mockPersonnel = [
  { id: 1, name: 'Pedro Cruz', role: 'Driver' },
  { id: 2, name: 'Juan Santos', role: 'Conductor' },
  { id: 3, name: 'Carlos Reyes', role: 'Driver' },
  { id: 4, name: 'Miguel Garcia', role: 'Conductor' },
  { id: 5, name: 'Luis Martinez', role: 'Driver' },
  { id: 6, name: 'Ana Lopez', role: 'Conductor' },
  { id: 7, name: 'Mark Unassigned', role: 'Driver' },
  { id: 8, name: 'Joy Unassigned', role: 'Conductor' },
];

const initialVehicles = [
  { id: 1, plateNumber: 'DEF-5678', route: 'Cubao - Fairview', driver: 'Pedro Cruz', conductor: 'Juan Santos', status: 'Operating', speed: 35 },
  { id: 2, plateNumber: 'GHI-9012', route: 'Monumento - Baclaran', driver: 'Carlos Reyes', conductor: 'Miguel Garcia', status: 'Under Maintenance', speed: 0 },
  { id: 3, plateNumber: 'JKL-3456', route: 'Quiapo - Divisoria', driver: 'Luis Martinez', conductor: null, status: 'Out of Service / Damaged', speed: 0 },
  { id: 4, plateNumber: 'ABC-1234', route: 'Quiapo - Divisoria', driver: 'Juan Santos', conductor: 'Ana Lopez', status: 'Operating', speed: 25 },
];

export default function VehiclesPage() {
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'vehicles' | 'personnel'>('vehicles');
  
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  // Calculate unassigned personnel based on current vehicles
  const { unassignedDrivers, unassignedConductors } = useMemo(() => {
    const assignedDrivers = new Set(vehicles.filter(v => v.driver).map(v => v.driver));
    const assignedConductors = new Set(vehicles.filter(v => v.conductor).map(v => v.conductor));

    return {
      unassignedDrivers: mockPersonnel.filter(p => p.role === 'Driver' && !assignedDrivers.has(p.name)),
      unassignedConductors: mockPersonnel.filter(p => p.role === 'Conductor' && !assignedConductors.has(p.name)),
    };
  }, [vehicles]);

  // Handlers for Add/Edit Modals
  const handleOpenVehicleModal = () => setIsVehicleModalOpen(true);
  const handleCloseVehicleModal = () => setIsVehicleModalOpen(false);
  
  const handleOpenEditModal = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setIsEditVehicleModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setEditingVehicle(null);
    setIsEditVehicleModalOpen(false);
  };

  const handleOpenPersonnelModal = () => setIsPersonnelModalOpen(true);
  const handleClosePersonnelModal = () => setIsPersonnelModalOpen(false);

  const handleSaveVehicle = (data: any) => {
    setVehicles(prev => [...prev, { ...data, id: prev.length + 1, speed: 0 }]);
    handleCloseVehicleModal();
  };

  const handleUpdateVehicle = (data: any) => {
    setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? { ...v, ...data } : v));
    handleCloseEditModal();
  };

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
        <VehicleTable 
          vehicles={vehicles} 
          searchQuery={searchQuery} 
          onEdit={handleOpenEditModal} 
        />
      ) : (
        <PersonnelTable searchQuery={searchQuery} />
      )}

      <AddVehicleModal 
        isOpen={isVehicleModalOpen} 
        onClose={handleCloseVehicleModal} 
        onSave={handleSaveVehicle}
        unassignedDrivers={unassignedDrivers}
        unassignedConductors={unassignedConductors}
      />

      <EditVehicleModal 
        isOpen={isEditVehicleModalOpen} 
        onClose={handleCloseEditModal} 
        onSave={handleUpdateVehicle}
        editingVehicle={editingVehicle}
        allPersonnel={mockPersonnel}
      />

      <AddPersonnelModal isOpen={isPersonnelModalOpen} onClose={handleClosePersonnelModal} />
    </>
  );
}