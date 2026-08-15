// app/(admin)/vehicles/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { VehicleTable } from '@/components/admin/vehicles/vehicle-table';
import { AddVehicleModal } from '@/components/admin/vehicles/add-vehicle-modal';
import { EditVehicleModal } from '@/components/admin/vehicles/edit-vehicle-modal';
import { ShiftHistoryModal } from '@/components/admin/vehicles/shift-history-modal';
import { VehicleDetailsModal } from '@/components/admin/vehicles/vehicle-details-modal';
import { PersonnelTable } from '@/components/admin/vehicles/personnel-table';
import { AddPersonnelModal } from '@/components/admin/vehicles/add-personnel-modal';
import { EditPersonnelModal } from '@/components/admin/vehicles/edit-personnel-modal';
import { DeletePersonnelModal } from '@/components/admin/vehicles/delete-personnel-modal';
import { CreateConductorAccountModal } from '@/components/admin/vehicles/create-conductor-account-modal';
import { ConductorAccountSuccessModal } from '@/components/admin/vehicles/conductor-account-success-modal';
import { HistoryTable } from '@/components/admin/vehicles/history-table';
import { Users, Car, Archive, AlertCircle, RefreshCw } from 'lucide-react';
import { useVehiclesData } from './data/vehicles-data';
import type { FleetHistoryTab, FleetShiftHistoryRange, PersonnelRoleFilter, Vehicle, Personnel } from './data/vehicles-data';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';

export default function VehiclesPage() {
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isEditPersonnelOpen, setIsEditPersonnelOpen] = useState(false);
  const [isDeletePersonnelOpen, setIsDeletePersonnelOpen] = useState(false);
  const [isShiftHistoryOpen, setIsShiftHistoryOpen] = useState(false);
  const [isCreateConductorOpen, setIsCreateConductorOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  
  const [createdAccountData, setCreatedAccountData] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    generated_username: string;
    generated_password: string;
  } | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [shiftHistoryVehicle, setShiftHistoryVehicle] = useState<Vehicle | null>(null);
  /** id of the vehicle whose details + permanent QR modal is open. null = closed. */
  const [detailsVehicleId, setDetailsVehicleId] = useState<string | null>(null);
  const [editingPersonnelData, setEditingPersonnelData] = useState<Personnel | null>(null);
  const [deletingPersonnelData, setDeletingPersonnelData] = useState<Personnel | null>(null);
  
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'vehicles' | 'personnel' | 'history'>('vehicles');
  const [historyTab, setHistoryTab] = useState<FleetHistoryTab>('shifts');
  const [personnelRole, setPersonnelRole] = useState<PersonnelRoleFilter>('all');
  const [shiftHistoryRange, setShiftHistoryRange] = useState<FleetShiftHistoryRange>('today');
  const [vehiclePage, setVehiclePage] = useState(1);
  const [personnelPage, setPersonnelPage] = useState(1);
  const [terminatedPage, setTerminatedPage] = useState(1);
  const [shiftPage, setShiftPage] = useState(1);

  const queryState = useMemo(() => ({
    activeTab,
    historyTab,
    searchQuery,
    personnelRole,
    shiftHistoryRange,
    vehiclePage,
    personnelPage,
    terminatedPage,
    shiftPage,
  }), [activeTab, historyTab, searchQuery, personnelRole, shiftHistoryRange, vehiclePage, personnelPage, terminatedPage, shiftPage]);

  const { data, counts, pages, isLoading, error, refetch } = useVehiclesData(queryState);
  
  const vehicles = data.vehicles;
  const historyRecords = counts.terminatedPersonnel + counts.shiftHistoryLog;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearchQuery(searchInput);
      setVehiclePage(1);
      setPersonnelPage(1);
      setTerminatedPage(1);
      setShiftPage(1);
    }, 350);

    return () => window.clearTimeout(id);
  }, [searchInput]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const handlePersonnelRoleChange = (role: PersonnelRoleFilter) => {
    setPersonnelRole(role);
    setPersonnelPage(1);
  };

  const handleShiftHistoryRangeChange = (range: FleetShiftHistoryRange) => {
    setShiftHistoryRange(range);
    setShiftPage(1);
  };

  const handleHistoryTabChange = (tab: FleetHistoryTab) => {
    setHistoryTab(tab);
    if (tab === 'terminated') {
      setTerminatedPage(1);
    } else {
      setShiftPage(1);
    }
  };

  const tabs = [
    { id: 'vehicles' as const, label: 'Vehicles', count: counts.vehicles, icon: Car },
    { id: 'personnel' as const, label: 'Personnel', count: counts.personnel, icon: Users },
    { id: 'history' as const, label: 'Records', count: historyRecords, icon: Archive },
  ];

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

  // Double-click a vehicle row → open the details modal (vehicle info +
  // today's driver/conductor + the permanent, printable unit QR).
  const handleOpenDetails = (vehicle: Vehicle) => { setDetailsVehicleId(vehicle.id); };
  const handleCloseDetails = () => { setDetailsVehicleId(null); };

  // Vehicle Handlers
  const handleOpenVehicleModal = () => setIsVehicleModalOpen(true);
  const handleCloseVehicleModal = () => setIsVehicleModalOpen(false);
  const handleOpenEditModal = (vehicle: Vehicle) => { setEditingVehicle(vehicle); setIsEditVehicleModalOpen(true); };
  const handleCloseEditModal = () => { setEditingVehicle(null); setIsEditVehicleModalOpen(false); };
  const handleSaveVehicle = (createdVehicleId: string) => {
    // Close the Add modal first, refresh the table, then surface the new
    // unit's permanent QR so the admin can download/print it immediately.
    handleCloseVehicleModal();
    refetch();
    if (createdVehicleId) setDetailsVehicleId(createdVehicleId);
  };

  // After PUT succeeds — the EditVehicleModal calls onSaved() which triggers this.
  // We refetch from the API to get the canonical record with fresh relationships.
  const handleVehicleUpdated = () => { refetch(); handleCloseEditModal(); };

  // Shift History Handlers — opens the modal that fetches /api/admin/shift-logs?vehicle_id=
  const handleOpenShiftHistory = (vehicle: Vehicle) => { setShiftHistoryVehicle(vehicle); setIsShiftHistoryOpen(true); };
  const handleCloseShiftHistory = () => { setShiftHistoryVehicle(null); setIsShiftHistoryOpen(false); };

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
  const handleSaveEditPersonnel = () => {
    // Modal calls real PUT /api/admin/drivers/{id} and triggers this onSaved()
    // callback on success. We refetch from the API to get the canonical record.
    refetch();
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
  const handleConfirmDeletePersonnel = async (deleteData: { id: string; reason: string; terminationType: string }): Promise<void> => {
    const person = deletingPersonnelData?.id === deleteData.id
      ? deletingPersonnelData
      : data.personnel.find(p => p.id === deleteData.id);
    if (!person) {
      throw new Error('Personnel not found. They may have already been removed.');
    }

    // Drivers → DELETE /api/admin/drivers/{id}
    // Conductors → DELETE /api/admin/conductors/{id} (separate from the
    // generic /admin/users/{id} because this flow persists the termination
    // reason + type to the terminated_personnel table).
    //
    // The modal's terminationType is 'Terminated' | 'Resigned' (UI labels).
    // The backend expects 'TERMINATED' | 'RESIGNED' (enum values). Convert.
    const endpoint = person.role === 'Driver'
      ? `/api/admin/drivers/${deleteData.id}`
      : `/api/admin/conductors/${deleteData.id}`;

    const terminationType = deleteData.terminationType === 'Resigned' ? 'RESIGNED' : 'TERMINATED';

    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        reason: deleteData.reason,
        termination_type: terminationType,
      }),
    });

    if (!res.ok) {
      let message = `Failed to remove ${person.role.toLowerCase()} (HTTP ${res.status}).`;
      try {
        const body = await res.json();
        // 409 conflict (active shift) → use the backend's specific message.
        // 422 validation error → surface the first field error.
        // Other errors → use the backend's message field if available.
        if (res.status === 409) {
          message = body?.message ?? `Cannot remove this ${person.role.toLowerCase()} — they may be on an active shift. End the shift first.`;
        } else if (res.status === 422 && body?.errors) {
          const firstField = Object.keys(body.errors)[0];
          const firstError = firstField ? body.errors[firstField]?.[0] : null;
          message = firstError ?? body?.message ?? message;
        } else if (body?.message) {
          message = body.message;
        }
      } catch {
        // Response wasn't JSON — keep the default HTTP-status message.
      }
      throw new Error(message);
    }

    // Success — refetch the canonical list from the API so the personnel
    // array reflects the soft-deletion AND the terminated_personnel table
    // gains the new row (both are fetched in fetchVehiclesData).
    await refetch();
  };

  // Add Personnel Handler — modal calls real POST /api/admin/drivers and
  // triggers this onSave() callback on success. We refetch from the API to
  // get the canonical record with the auto-generated UUID + relationships.
  const handleSaveNewPersonnel = () => {
    refetch();
    handleClosePersonnelModal();
  };

  // Shift & Conductor Handlers
  const handleOpenCreateConductor = () => setIsCreateConductorOpen(true);
  const handleCloseCreateConductor = () => setIsCreateConductorOpen(false);
  // Called by the modal after POST /api/admin/conductors succeeds — receives
  // the real generated credentials from the backend, shows the success modal,
  // and refetches the personnel list so the new conductor appears.
  const handleConductorCreated = (account: {
    id: string;
    first_name: string;
    last_name: string;
    generated_username: string;
    generated_password: string;
  }) => {
    setCreatedAccountData(account);
    setIsSuccessModalOpen(true);
    handleCloseCreateConductor();
    refetch();
  };
  const handleCloseSuccessModal = () => { setIsSuccessModalOpen(false); setCreatedAccountData(null); };

  return (
    <>
      <StickyPageHeader className="mb-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-white">Fleet Management</h1>
        </div>
      </StickyPageHeader>

      {/* Tab Navigation */}
      <div className="mb-3 flex w-full gap-1.5 rounded-lg border border-[#1E2D45] bg-[#0E1628] p-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? tab.id === 'history'
                    ? 'bg-red-400/15 text-red-200 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.18)]'
                    : 'bg-[#62A0EA]/15 text-white shadow-[inset_0_0_0_1px_rgba(98,160,234,0.18)]'
                  : 'text-slate-400 hover:bg-[#172238] hover:text-white'
              }`}
            >
              <tab.icon size={15} className={isActive && tab.id === 'history' ? 'text-red-300' : isActive ? 'text-[#62A0EA]' : 'text-slate-500'} />
              <span>{tab.label}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                isActive ? 'bg-black/20 text-slate-100' : 'bg-[#1A2540] text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'vehicles' ? (
        <VehicleTable
          vehicles={vehicles}
          searchQuery={searchInput}
          page={pages.vehicles}
          onPageChange={setVehiclePage}
          onSearchChange={handleSearchChange}
          onAddVehicle={handleOpenVehicleModal}
          onEdit={handleOpenEditModal}
          onEditShift={handleOpenShiftHistory}
          onRowDoubleClick={handleOpenDetails}
          isLoading={isLoading}
        />
      ) : activeTab === 'personnel' ? (
        <PersonnelTable 
          personnel={data.personnel}
          searchQuery={searchInput} 
          roleFilter={personnelRole}
          page={pages.personnel}
          onPageChange={setPersonnelPage}
          onSearchChange={handleSearchChange}
          onRoleFilterChange={handlePersonnelRoleChange}
          onAddDriver={handleOpenPersonnelModal}
          onCreateConductor={handleOpenCreateConductor}
          onEdit={handleOpenEditPersonnel}
          onDelete={handleOpenDeletePersonnel}
          driverProfiles={data.driverProfiles}
          driverRatings={data.driverRatings}
          isLoading={isLoading}
        />
      ) : (
        <HistoryTable 
          terminatedPersonnel={data.terminatedPersonnel} 
          shiftHistoryLog={data.shiftHistoryLog}
          searchQuery={searchInput}
          historyTab={historyTab}
          onHistoryTabChange={handleHistoryTabChange}
          shiftHistoryRange={shiftHistoryRange}
          onShiftHistoryRangeChange={handleShiftHistoryRangeChange}
          terminatedPage={pages.terminatedPersonnel}
          shiftPage={pages.shiftHistoryLog}
          onTerminatedPageChange={setTerminatedPage}
          onShiftPageChange={setShiftPage}
          onSearchChange={handleSearchChange}
          counts={{
            terminated: counts.terminatedPersonnel,
            shifts: counts.shiftHistoryLog,
          }}
          isLoading={isLoading}
        />
      )}

      {/* All Modals */}
      <AddVehicleModal isOpen={isVehicleModalOpen} onClose={handleCloseVehicleModal} onSave={handleSaveVehicle} />
      <EditVehicleModal
        isOpen={isEditVehicleModalOpen}
        onClose={handleCloseEditModal}
        onSaved={handleVehicleUpdated}
        editingVehicle={editingVehicle}
      />
      <ShiftHistoryModal
        isOpen={isShiftHistoryOpen}
        onClose={handleCloseShiftHistory}
        vehicle={shiftHistoryVehicle}
      />
      <VehicleDetailsModal
        isOpen={detailsVehicleId !== null}
        vehicleId={detailsVehicleId}
        onClose={handleCloseDetails}
      />
      <AddPersonnelModal isOpen={isPersonnelModalOpen} onClose={handleClosePersonnelModal} onSave={handleSaveNewPersonnel} />
      <EditPersonnelModal isOpen={isEditPersonnelOpen} onClose={handleCloseEditPersonnel} onSaved={handleSaveEditPersonnel} editingData={editingPersonnelData} />
      <DeletePersonnelModal isOpen={isDeletePersonnelOpen} onClose={handleCloseDeletePersonnel} onConfirm={handleConfirmDeletePersonnel} personnelData={deletingPersonnelData} />

      <CreateConductorAccountModal isOpen={isCreateConductorOpen} onClose={handleCloseCreateConductor} onCreated={handleConductorCreated} />
      <ConductorAccountSuccessModal isOpen={isSuccessModalOpen} onClose={handleCloseSuccessModal} accountData={createdAccountData} />
    </>
  );
}
