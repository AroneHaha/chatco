// app/(admin)/vehicles/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { VehicleTable } from '@/components/admin/vehicles/vehicle-table';
import { AddVehicleModal } from '@/components/admin/vehicles/add-vehicle-modal';
import { EditVehicleModal } from '@/components/admin/vehicles/edit-vehicle-modal';
import { PersonnelTable } from '@/components/admin/vehicles/personnel-table';
import { AddPersonnelModal } from '@/components/admin/vehicles/add-personnel-modal';
import { EditPersonnelModal } from '@/components/admin/vehicles/edit-personnel-modal';
import { DeletePersonnelModal } from '@/components/admin/vehicles/delete-personnel-modal';
import { CreateConductorAccountModal } from '@/components/admin/vehicles/create-conductor-account-modal';
import { ConductorAccountSuccessModal } from '@/components/admin/vehicles/conductor-account-success-modal';
import { HistoryTable } from '@/components/admin/vehicles/history-table'; 
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Plus, Users, Car, UserPlus, Archive } from 'lucide-react';
import {
  initialPersonnel,
  initialVehicles,
  initialTerminatedPersonnel,
  initialShiftHistoryLog,
} from './data/vehicles-data';
import type { Vehicle, Personnel, TerminatedPersonnel, ShiftLog } from './data/vehicles-data';

export default function VehiclesPage() {
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isEditPersonnelOpen, setIsEditPersonnelOpen] = useState(false);
  const [isDeletePersonnelOpen, setIsDeletePersonnelOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCreateConductorOpen, setIsCreateConductorOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  
  const [createdAccountData, setCreatedAccountData] = useState<{ firstName: string; lastName: string; birthday: string; route: string } | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingPersonnelData, setEditingPersonnelData] = useState<Personnel | null>(null);
  const [deletingPersonnelData, setDeletingPersonnelData] = useState<Personnel | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'vehicles' | 'personnel' | 'history'>('vehicles');
  
  const [vehicles, setVehicles] = useState(initialVehicles);

  const { unassignedDrivers, unassignedConductors } = useMemo(() => {
    const assignedDrivers = new Set(vehicles.filter(v => v.driver).map(v => v.driver));
    const assignedConductors = new Set(vehicles.filter(v => v.conductor).map(v => v.conductor));
    return {
      unassignedDrivers: initialPersonnel.filter(p => p.role === 'Driver' && !assignedDrivers.has(p.name)),
      unassignedConductors: initialPersonnel.filter(p => p.role === 'Conductor' && !assignedConductors.has(p.name)),
    };
  }, [vehicles]);

  // Vehicle Handlers
  const handleOpenVehicleModal = () => setIsVehicleModalOpen(true);
  const handleCloseVehicleModal = () => setIsVehicleModalOpen(false);
  const handleOpenEditModal = (vehicle: Vehicle) => { setEditingVehicle(vehicle); setIsEditVehicleModalOpen(true); };
  const handleCloseEditModal = () => { setEditingVehicle(null); setIsEditVehicleModalOpen(false); };
  const handleSaveVehicle = (data: Partial<Vehicle>) => { setVehicles(prev => [...prev, { ...data, id: prev.length + 1, speed: 0 } as Vehicle]); handleCloseVehicleModal(); };
  const handleUpdateVehicle = (data: Partial<Vehicle>) => { setVehicles(prev => prev.map(v => v.id === editingVehicle?.id ? { ...v, ...data } : v)); handleCloseEditModal(); };

  // Personnel Handlers
  const handleOpenPersonnelModal = () => setIsPersonnelModalOpen(true);
  const handleClosePersonnelModal = () => setIsPersonnelModalOpen(false);
  
  const handleOpenEditPersonnel = (personnel: Personnel) => {
    setEditingPersonnelData(personnel);
    setIsEditPersonnelOpen(true);
  };
  const handleCloseEditPersonnel = () => {
    setEditingPersonnelData(null);
    setIsEditPersonnelOpen(false);
  };
  const handleSaveEditPersonnel = (data: Personnel) => {
    console.log("Updated Personnel:", data);
    handleCloseEditPersonnel();
    // In a real app, you would update the personnel state here
  };

  const handleOpenDeletePersonnel = (personnel: Personnel) => {
    setDeletingPersonnelData(personnel);
    setIsDeletePersonnelOpen(true);
  };
  const handleCloseDeletePersonnel = () => {
    setDeletingPersonnelData(null);
    setIsDeletePersonnelOpen(false);
  };
  const handleConfirmDeletePersonnel = (data: { id: number; reason: string; terminationType: string }) => {
    console.log("Deleted Personnel ID:", data.id, "Reason:", data.reason);
    handleCloseDeletePersonnel();
    // In a real app, you would move this personnel to terminatedPersonnel state here
  };

  // Shift & Conductor Handlers
  const handleOpenShiftModal = (vehicle: Vehicle) => { setEditingVehicle(vehicle); setIsShiftModalOpen(true); };
  const handleCloseShiftModal = () => { setEditingVehicle(null); setIsShiftModalOpen(false); };
  const handleSaveShift = (data: Record<string, string>) => { console.log("Shift saved for vehicle:", editingVehicle?.plateNumber, data); handleCloseShiftModal(); };
  
  const handleOpenCreateConductor = () => setIsCreateConductorOpen(true);
  const handleCloseCreateConductor = () => setIsCreateConductorOpen(false);
  const handleSaveConductorAccount = (data: { firstName: string; lastName: string; birthday: string; route: string }) => { setCreatedAccountData(data); setIsSuccessModalOpen(true); handleCloseCreateConductor(); };
  const handleCloseSuccessModal = () => { setIsSuccessModalOpen(false); setCreatedAccountData(null); };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Fleet Management</h1>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <SearchBar
            placeholder={`Search ${activeTab === 'history' ? 'history...' : activeTab}...`}
            value={searchQuery}
            onChange={setSearchQuery}
            className="flex-1"
          />
          
          {activeTab !== 'history' && (
            <>
              <button
                onClick={handleOpenCreateConductor}
                className="flex items-center space-x-2 px-4 py-2 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors flex-shrink-0"
              >
                <UserPlus size={20} />
                <span className="hidden sm:inline">Conductor Account</span>
              </button>

              <button
                onClick={activeTab === 'vehicles' ? handleOpenVehicleModal : handleOpenPersonnelModal}
                className="flex items-center space-x-2 px-4 py-2 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors flex-shrink-0"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">Add {activeTab === 'vehicles' ? 'Vehicle' : 'Driver'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b border-[#1E2D45]">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-md transition-colors ${
            activeTab === 'vehicles' ? 'text-white border-b-2 border-[#62A0EA] bg-[#62A0EA]/10' : 'text-slate-400 hover:text-white hover:bg-[#1A2540]'
          }`}
        >
          <Car size={20} />
          <span>Vehicles</span>
        </button>
        <button
          onClick={() => setActiveTab('personnel')}
          className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-md transition-colors ${
            activeTab === 'personnel' ? 'text-white border-b-2 border-[#62A0EA] bg-[#62A0EA]/10' : 'text-slate-400 hover:text-white hover:bg-[#1A2540]'
          }`}
        >
          <Users size={20} />
          <span>Chatco Personnel</span>
        </button>
        
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-md transition-colors ${
            activeTab === 'history' ? 'text-white border-b-2 border-red-400 bg-red-400/10' : 'text-slate-400 hover:text-white hover:bg-[#1A2540]'
          }`}
        >
          <Archive size={20} />
          <span>Records & History</span>
        </button>
      </div>

      {/* Tab Content - NOW PASSES onEdit AND onDelete TO PersonnelTable */}
      {activeTab === 'vehicles' ? (
        <VehicleTable 
          vehicles={vehicles} 
          searchQuery={searchQuery} 
          onEdit={handleOpenEditModal}
          onEditShift={handleOpenShiftModal} 
        />
      ) : activeTab === 'personnel' ? (
        <PersonnelTable 
          searchQuery={searchQuery} 
          onEdit={handleOpenEditPersonnel}
          onDelete={handleOpenDeletePersonnel}
        />
      ) : (
        <HistoryTable 
          terminatedPersonnel={initialTerminatedPersonnel} 
          shiftHistoryLog={initialShiftHistoryLog}
          searchQuery={searchQuery}
        />
      )}

      {/* All Modals */}
      <AddVehicleModal isOpen={isVehicleModalOpen} onClose={handleCloseVehicleModal} onSave={handleSaveVehicle} unassignedDrivers={unassignedDrivers} unassignedConductors={unassignedConductors} />
      <EditVehicleModal isOpen={isEditVehicleModalOpen} onClose={handleCloseEditModal} onSave={handleUpdateVehicle} editingVehicle={editingVehicle} allPersonnel={initialPersonnel} />
      <AddPersonnelModal isOpen={isPersonnelModalOpen} onClose={handleClosePersonnelModal} />
      <EditPersonnelModal isOpen={isEditPersonnelOpen} onClose={handleCloseEditPersonnel} onSave={handleSaveEditPersonnel} editingData={editingPersonnelData} />
      <DeletePersonnelModal isOpen={isDeletePersonnelOpen} onClose={handleCloseDeletePersonnel} onConfirm={handleConfirmDeletePersonnel} personnelData={deletingPersonnelData} />

      <CreateConductorAccountModal isOpen={isCreateConductorOpen} onClose={handleCloseCreateConductor} onSave={handleSaveConductorAccount} />
      <ConductorAccountSuccessModal isOpen={isSuccessModalOpen} onClose={handleCloseSuccessModal} accountData={createdAccountData} />
    </>
  );
}