// components/admin/vehicles/vehicle-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';

interface VehicleTableProps {
  searchQuery: string;
}

const mockVehicles = [
  { id: 1, plateNumber: 'DEF-5678', route: 'Cubao - Fairview', driver: 'Pedro Cruz', conductor: 'Juan Santos', status: 'Available', speed: 35 },
  { id: 2, plateNumber: 'GHI-9012', route: 'Monumento - Baclaran', driver: 'Carlos Reyes', conductor: 'Miguel Garcia', status: 'Full', speed: 15 },
  { id: 3, plateNumber: 'JKL-3456', route: 'Quiapo - Divisoria', driver: 'Miguel García', conductor: 'Luis Martinez', status: 'Off Duty', speed: 0 },
  { id: 4, plateNumber: 'ABC-1234', route: 'Quiapo - Divisoria', driver: 'Juan Santos', conductor: 'Ana Lopez', status: 'Available', speed: 25 },
];

export function VehicleTable({ searchQuery }: VehicleTableProps) {
  const columns = [
    { key: 'plateNumber', label: 'Plate' },
    { key: 'route', label: 'Route' },
    { key: 'driver', label: 'Driver' },
    { key: 'conductor', label: 'Conductor' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        let variant: 'success' | 'warning' | 'danger' | 'info' = 'info';
        if (value === 'Available') variant = 'success';
        if (value === 'Full') variant = 'warning';
        if (value === 'Off Duty') variant = 'danger';
        return <Badge variant={variant}>{value}</Badge>;
      },
    },
    { key: 'speed', label: 'Speed', render: (value: number) => `${value} km/h` },
  ];

  return <DataTable data={mockVehicles} columns={columns} searchQuery={searchQuery} />;
}