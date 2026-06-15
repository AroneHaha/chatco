// components/admin/vehicles/vehicle-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { Pencil, Clock } from 'lucide-react'; // Added icons

// REMOVED the hardcoded mockVehicles array since we are getting it from the page now

interface VehicleTableProps {
  vehicles: any[]; // Added vehicles prop
  searchQuery: string;
  onEdit: (vehicle: any) => void; // Added edit handler
  onEditShift: (vehicle: any) => void; // Added shift handler
}

export function VehicleTable({ vehicles, searchQuery, onEdit, onEditShift }: VehicleTableProps) {
  const columns = [
    { key: 'plateNumber', label: 'Plate' },
    { key: 'route', label: 'Route' },
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
      // We pass the whole row (vehicle) to the render function so we can trigger the modals
      render: (_: any, row: any) => (
        <div className="flex items-center justify-end gap-2">
          {/* Edit Shift Icon */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEditShift(row);
            }}
            title="Edit Shift"
            className="p-1.5 text-slate-400 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10 rounded-md transition-colors"
          >
            <Clock size={16} />
          </button>

          {/* Edit Vehicle Icon */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
            title="Edit Vehicle"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1A2540] rounded-md transition-colors"
          >
            <Pencil size={16} />
          </button>
        </div>
      )
    },
  ];

  // Changed mockVehicles to the vehicles prop
  return <DataTable data={vehicles} columns={columns} searchQuery={searchQuery} />;
}