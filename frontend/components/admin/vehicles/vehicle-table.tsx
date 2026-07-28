// components/admin/vehicles/vehicle-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { Pencil, Clock } from 'lucide-react'; // Added icons
import type { Vehicle } from '@/app/(admin)/vehicles/data/vehicles-data';

// REMOVED the hardcoded mockVehicles array since we are getting it from the page now

interface VehicleTableProps {
  vehicles: Vehicle[];
  searchQuery: string;
  onEdit: (vehicle: Vehicle) => void;
  onEditShift: (vehicle: Vehicle) => void;
  /** Double-clicking a row opens the vehicle details (incl. permanent QR). */
  onRowDoubleClick?: (vehicle: Vehicle) => void;
}

export function VehicleTable({ vehicles, searchQuery, onEdit, onEditShift, onRowDoubleClick }: VehicleTableProps) {
  const columns = [
    { key: 'unitNumber', label: 'Unit Number' },
    { key: 'plateNumber', label: 'Plate Number' },
    { key: 'driver', label: 'Driver', render: (value: string | null) => value || <span className="text-slate-500 italic">Unassigned</span> },
    { key: 'conductor', label: 'Conductor', render: (value: string | null) => value || <span className="text-slate-500 italic">Unassigned</span> },
    {
      key: 'status',
      label: 'Status',
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

  // Changed mockVehicles to the vehicles prop
  return (
    <DataTable
      data={vehicles}
      columns={columns}
      searchQuery={searchQuery}
      onRowDoubleClick={onRowDoubleClick}
    />
  );
}
