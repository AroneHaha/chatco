// components/admin/vehicles/vehicle-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { Pencil } from 'lucide-react';

interface VehicleTableProps {
  vehicles: any[];
  searchQuery: string;
  onEdit: (vehicle: any) => void;
}

export function VehicleTable({ vehicles, searchQuery, onEdit }: VehicleTableProps) {
  const columns = [
    { key: 'plateNumber', label: 'Plate' },
    { key: 'route', label: 'Route' },
    { key: 'driver', label: 'Driver', render: (value: string | null) => value || <span className="text-gray-500 italic">Unassigned</span> },
    { key: 'conductor', label: 'Conductor', render: (value: string | null) => value || <span className="text-gray-500 italic">Unassigned</span> },
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
    { key: 'speed', label: 'Speed', render: (value: number) => `${value} km/h` },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row);
          }}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
          title="Edit Vehicle"
        >
          <Pencil size={16} />
        </button>
      ),
    },
  ];

  return <DataTable data={vehicles} columns={columns} searchQuery={searchQuery} />;
}