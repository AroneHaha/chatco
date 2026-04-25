// components/admin/vehicles/vehicle-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';

const mockVehicles = [
  { plateNumber: 'XQJ 4728', route: 'Malolos - Meycauayan - Calumpit', driver: 'Marco Reyes', conductor: 'Juan Dela Cruz', status: 'Operating' },
  { plateNumber: 'VMY 9183', route: 'Malolos - Meycauayan - Calumpit', driver: 'Pedro Santos', conductor: 'Jose Rizal', status: 'Operating' },
  { plateNumber: 'RZP 6041', route: 'Malolos - Meycauayan - Calumpit', driver: null, conductor: null, status: 'Under Maintenance' },
  { plateNumber: 'LKW 3579', route: 'Malolos - Meycauayan - Calumpit', driver: 'Andres Bonifacio', conductor: 'Emilio Aguinaldo', status: 'Operating' },
  { plateNumber: 'TNB 8462', route: 'Malolos - Meycauayan - Calumpit', driver: null, conductor: null, status: 'Out of Service / Damaged' },
  { plateNumber: 'JHX 7905', route: 'Malolos - Meycauayan - Calumpit', driver: 'Carlos Garcia', conductor: 'Ramon Magsaysay', status: 'Operating' },
  { plateNumber: 'QFD 2316', route: 'Malolos - Meycauayan - Calumpit', driver: 'Maria Clara', conductor: null, status: 'Operating' },
  { plateNumber: 'PVR 6894', route: 'Malolos - Meycauayan - Calumpit', driver: null, conductor: null, status: 'Under Maintenance' },
  { plateNumber: 'KSL 5043', route: 'Malolos - Meycauayan - Calumpit', driver: 'Antonio Luna', conductor: 'Graciano Lopez', status: 'Operating' },
];

interface VehicleTableProps {
  searchQuery: string;
}

export function VehicleTable({ searchQuery }: VehicleTableProps) {
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
  ];

  return <DataTable data={mockVehicles} columns={columns} searchQuery={searchQuery} />;
}