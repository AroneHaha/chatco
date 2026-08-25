'use client';

// components/admin/vehicles/vehicle-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { Badge } from '@/components/admin/ui/badge';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Pencil, Clock, Car, Plus } from 'lucide-react'; // Added icons
import type { PageMeta, Vehicle } from '@/app/(admin)/vehicles/data/vehicles-data';
import { SkeletonTable } from '@/components/admin/ui/skeleton';

// REMOVED the hardcoded mockVehicles array since we are getting it from the page now

interface VehicleTableProps {
  vehicles: Vehicle[];
  searchQuery: string;
  page: PageMeta;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onAddVehicle: () => void;
  onEdit: (vehicle: Vehicle) => void;
  onEditShift: (vehicle: Vehicle) => void;
  /** Double-clicking a row opens the vehicle details (incl. permanent QR). */
  onRowDoubleClick?: (vehicle: Vehicle) => void;
  isLoading?: boolean;
}

export function VehicleTable({
  vehicles,
  searchQuery,
  page,
  onPageChange,
  onSearchChange,
  onAddVehicle,
  onEdit,
  onEditShift,
  onRowDoubleClick,
  isLoading = false,
}: VehicleTableProps) {
  const columns = [
    {
      key: 'unitNumber',
      label: 'Unit',
      cellClassName: 'whitespace-nowrap',
      render: (value: string) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#62A0EA]">
            <Car size={17} />
          </div>
          <p className="font-semibold text-white">{value}</p>
        </div>
      ),
    },
    { key: 'plateNumber', label: 'Plate', cellClassName: 'whitespace-nowrap font-mono text-xs' },
    { key: 'driver', label: 'Driver', cellClassName: 'whitespace-nowrap', render: (value: string | null) => value || <span className="text-slate-500 italic">Unassigned</span> },
    { key: 'conductor', label: 'Conductor', cellClassName: 'whitespace-nowrap', render: (value: string | null) => value || <span className="text-slate-500 italic">Unassigned</span> },
    {
      key: 'status',
      label: 'Status',
      cellClassName: 'whitespace-nowrap',
      render: (value: string) => {
        let variant: 'success' | 'warning' | 'danger' | 'info' = 'info';
        if (value === 'Operating') variant = 'success';
        if (value === 'Under Maintenance') variant = 'warning';
        if (value === 'Out of Service / Damaged') variant = 'danger';
        return <Badge variant={variant}>{value}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center' as const,
      headerClassName: 'w-24',
      cellClassName: 'w-24',
      // We pass the whole row (vehicle) to the render function so we can trigger the modals
      render: (_: unknown, row: Vehicle) => (
        // Stop double-click on the action buttons from also opening the
        // details modal — the row-level onDoubleClick handles that intent.
        <div
          className="flex items-center justify-center gap-2"
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {/* Shift History Button (clock icon) */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEditShift(row);
            }}
            title="View shift history"
            aria-label={`View shift history for ${row.plateNumber}`}
            className="p-1.5 text-slate-400 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10 rounded-md transition-colors"
          >
            <Clock size={16} />
          </button>

          {/* Edit Vehicle Button (pencil icon) */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
            title="Edit vehicle"
            aria-label={`Edit vehicle ${row.plateNumber}`}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1A2540] rounded-md transition-colors"
          >
            <Pencil size={16} />
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-[#1E2D45] bg-[#111A2B] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar
          placeholder="Search vehicles..."
          value={searchQuery}
          onChange={onSearchChange}
          className="min-w-0 w-full lg:max-w-sm"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={onAddVehicle}
            className="flex items-center justify-center gap-2 rounded-md bg-[#62A0EA] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A8BD4]"
          >
            <Plus size={18} />
            <span>Add Vehicle</span>
          </button>
        <span className="rounded-md bg-[#62A0EA]/10 px-2 py-1 text-xs font-bold text-[#62A0EA]">
          {page.total} Records
        </span>
        </div>
      </div>
      {isLoading ? (
        <div className="h-[calc(100dvh-18rem)] min-h-64 overflow-hidden rounded-lg">
          <SkeletonTable rows={8} columns={6} />
        </div>
      ) : (
        <DataTable
          data={vehicles}
          columns={columns}
          searchQuery=""
          emptyMessage="No vehicles match your search."
          height="calc(100dvh - 18rem)"
          stickyHeader
          onRowDoubleClick={onRowDoubleClick}
        />
      )}
      <TablePagination
        currentPage={page.currentPage}
        totalPages={page.totalPages}
        from={page.from}
        to={page.to}
        total={page.total}
        label="vehicles"
        onPageChange={onPageChange}
      />
    </div>
  );
}
