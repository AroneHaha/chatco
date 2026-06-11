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
import { Plus, Users, Car, UserPlus, Archive, AlertCircle, RefreshCw } from 'lucide-react';
import { useVehiclesData } from './data/vehicles-data';
import type { Vehicle, Personnel, TerminatedPersonnel, ShiftLog } from './data/vehicles-data';
import { SkeletonTable } from '@/components/admin/ui/skeleton';

export default function VehiclesPage() {
  const { data, isLoading, error, refetch, setData } = useVehiclesData();

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
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(data.vehicles);

  // Sync vehicles when data changes
  useMemo(() => {
    setVehicles(data.vehicles);
  }, [data.vehicles]);

  const { unassignedDrivers, unassignedConductors } = useMemo(() => {
    const assignedDrivers = new Set(vehicles.filter(v => v.driver).map(v => v.driver));
    const assignedConductors = new Set(vehicles.filter(v => v.conductor).map(v => v.conductor));
    return {
      unassignedDrivers: data.personnel.filter((p): p is Personnel & { role: 'Driver' } => p.role === 'Driver' && !assignedDrivers.has(p.name)),
      unassignedConductors: data.personnel.filter((p): p is Personnel & { role: 'Conductor' } => p.role === 'Conductor' && !assignedConductors.has(p.name)),
    };
  }, [vehicles, data.personnel]);

  // ─── Loading State ───
  if (isLoading) {
    return (
      <>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-white">Fleet Management</h1>
        </div>
        <div className="flex space-x-1 mb-6 border-b border-[#1E2D45]">
          <div className="py-2 px-4"><span className="text-sm text-slate-500">Vehicles</span></div>
          <div className="py-2 px-4"><span className="text-sm text-slate-500">Personnel</span></div>
          <div className="py-2 px-4"><span className="text-sm text-slate-500">History</span></div>
        </div>
        <SkeletonTable rows={5} columns={5} />
      </>
    );
  }

  // ─── Error State ───
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-slate-300 text-center">Failed to load fleet data.</p>
        <p className="text-slate-500 text-sm text-center">{error}</p>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-[#62A0EA] text-white rounded-md hover:bg-[#4A8BD4] transition-colors"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  // Vehicle Handlers
  const handleOpenVehicleModal = () => setIsVehicleModalOpen(true);
  const handleCloseVehicleModal = () => setIsVehicleModalOpen(false);
  const handleOpenEditModal = (vehicle: Vehicle) => { setEditingVehicle(vehicle); setIsEditVehicleModalOpen(true); };
  const handleCloseEditModal = () => { setEditingVehicle(null); setIsEditVehicleModalOpen(false); };
  const handleSaveVehicle = (newVehicle: Partial<Vehicle>) => { setVehicles(prev => [...prev, { ...newVehicle, id: prev.length + 1, speed: 0 } as Vehicle]); handleCloseVehicleModal(); };
  const handleUpdateVehicle = (updatedVehicle: Partial<Vehicle>) => { setVehicles(prev => prev.map(v => v.id === editingVehicle?.id ? { ...v, ...updatedVehicle } : v)); handleCloseEditModal(); };

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
  const handleSaveEditPersonnel = (updatedPersonnel: Personnel) => {
    // TODO: Replace with API call when backend is ready
    setData(prev => ({
      ...prev,
      personnel: prev.personnel.map(p => p.id === updatedPersonnel.id ? updatedPersonnel : p),
    }));
    handleCloseEditPersonnel();
  };

  const handleOpenDeletePersonnel = (personnel: Personnel) => {
    setDeletingPersonnelData(personnel);
    setIsDeletePersonnelOpen(true);
  };
  const handleCloseDeletePersonnel = () => {
    setDeletingPersonnelData(null);
    setIsDeletePersonnelOpen(false);
  };
  const handleConfirmDeletePersonnel = (deleteData: { id: number; reason: string; terminationType: string }) => {
    // TODO: Replace with API call when backend is ready
    const person = data.personnel.find(p => p.id === deleteData.id);
    if (person) {
      const terminatedEntry: TerminatedPersonnel = {
        ...person,
        status: deleteData.terminationType === 'Resigned' ? 'Resigned' : 'Terminated',
        reason: deleteData.reason,
        terminatedDate: new Date().toISOString().split('T')[0],
        lastVehicle: '-',
      };
      setData(prev => ({
        ...prev,
        personnel: prev.personnel.filter(p => p.id !== deleteData.id),
        terminatedPersonnel: [...prev.terminatedPersonnel, terminatedEntry],
      }));
    }
    handleCloseDeletePersonnel();
  };

  // Add Personnel Handler (from modal onSave callback)
  const handleSaveNewPersonnel = (newPersonnelData: {
    firstName: string;
    middleName: string;
    lastName: string;
    birthday: string;
    contact: string;
    route: string;
    role: 'Driver';
    profilePicture: string | null;
  }) => {
    // TODO: Replace with API call when backend is ready
    const newPerson: Personnel = {
      id: Math.max(...data.personnel.map(p => p.id), 0) + 1,
      name: `${newPersonnelData.firstName} ${newPersonnelData.middleName ? newPersonnelData.middleName + ' ' : ''}${newPersonnelData.lastName}`,
      role: newPersonnelData.role,
      contact: newPersonnelData.contact,
      profilePic: newPersonnelData.profilePicture || `https://placehold.co/150x150/0A1E33/62A0EA?text=${newPersonnelData.firstName.charAt(0)}${newPersonnelData.lastName.charAt(0)}`,
    };
    setData(prev => ({
      ...prev,
      personnel: [...prev.personnel, newPerson],
    }));
  };

  // Shift & Conductor Handlers
  const handleOpenShiftModal = (vehicle: Vehicle) => { setEditingVehicle(vehicle); setIsShiftModalOpen(true); };
  const handleCloseShiftModal = () => { setEditingVehicle(null); setIsShiftModalOpen(false); };
  const handleSaveShift = (shiftData: Record<string, string>) => {
    // TODO: Replace with API call when backend is ready
    console.log("Shift saved for vehicle:", editingVehicle?.plateNumber, shiftData);
    handleCloseShiftModal();
  };
  
  const handleOpenCreateConductor = () => setIsCreateConductorOpen(true);
  const handleCloseCreateConductor = () => setIsCreateConductorOpen(false);
  const handleSaveConductorAccount = (accountData: { firstName: string; lastName: string; birthday: string; route: string }) => { setCreatedAccountData(accountData); setIsSuccessModalOpen(true); handleCloseCreateConductor(); };
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

      {/* Tab Content */}
      {activeTab === 'vehicles' ? (
        <VehicleTable 
          vehicles={vehicles} 
          searchQuery={searchQuery} 
          onEdit={handleOpenEditModal}
          onEditShift={handleOpenShiftModal} 
        />
      ) : activeTab === 'personnel' ? (
        <PersonnelTable 
          personnel={data.personnel}
          searchQuery={searchQuery} 
          onEdit={handleOpenEditPersonnel}
          onDelete={handleOpenDeletePersonnel}
          driverProfiles={data.driverProfiles}
          driverRatings={data.driverRatings}
        />
      ) : (
        <HistoryTable 
          terminatedPersonnel={data.terminatedPersonnel} 
          shiftHistoryLog={data.shiftHistoryLog}
          searchQuery={searchQuery}
        />
      )}

      {/* All Modals */}
      <AddVehicleModal isOpen={isVehicleModalOpen} onClose={handleCloseVehicleModal} onSave={handleSaveVehicle} unassignedDrivers={unassignedDrivers} unassignedConductors={unassignedConductors} />
      <EditVehicleModal isOpen={isEditVehicleModalOpen} onClose={handleCloseEditModal} onSave={handleUpdateVehicle} editingVehicle={editingVehicle} allPersonnel={data.personnel} />
      <AddPersonnelModal isOpen={isPersonnelModalOpen} onClose={handleClosePersonnelModal} onSave={handleSaveNewPersonnel} />
      <EditPersonnelModal isOpen={isEditPersonnelOpen} onClose={handleCloseEditPersonnel} onSave={handleSaveEditPersonnel} editingData={editingPersonnelData} />
      <DeletePersonnelModal isOpen={isDeletePersonnelOpen} onClose={handleCloseDeletePersonnel} onConfirm={handleConfirmDeletePersonnel} personnelData={deletingPersonnelData} />

      <CreateConductorAccountModal isOpen={isCreateConductorOpen} onClose={handleCloseCreateConductor} onSave={handleSaveConductorAccount} />
      <ConductorAccountSuccessModal isOpen={isSuccessModalOpen} onClose={handleCloseSuccessModal} accountData={createdAccountData} />
    </>
  );
}