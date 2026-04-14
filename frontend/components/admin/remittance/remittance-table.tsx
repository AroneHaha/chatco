// components/admin/remittance/remittance-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { ReactNode } from 'react'; // Added this import

export function RemittanceTable() {
  const mockData = [
    { id: 'S-101', conductor: 'Juan Dela Cruz', vehicle: 'ABC-123', status: 'Remitted', amount: '₱2,500.00' },
    { id: 'S-102', conductor: 'Pedro Santos', vehicle: 'XYZ-789', status: 'Pending', amount: '₱2,450.00' },
    { id: 'S-103', conductor: 'Maria Reyes', vehicle: 'DEF-456', status: 'Remitted', amount: '₱2,600.00' },
  ];

  const columns = [
    { key: 'id', label: 'Shift ID' },
    { key: 'conductor', label: 'Conductor' },
    { key: 'vehicle', label: 'Vehicle Plate' },
    { key: 'amount', label: 'Remitted Amount' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'Remitted' ? 'success' : 'warning'}>{value}</Badge>
      ),
    },
  ];

  return <DataTable data={mockData} columns={columns} />;
}