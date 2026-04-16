// components/admin/vehicles/personnel-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Edit, Trash } from 'lucide-react';

const mockPersonnel = [
  { id: 1, name: 'Alex Rivera', role: 'Dispatcher', department: 'Operations', status: 'On Duty', contact: '0917-123-4567' },
  { id: 2, name: 'Bianca Santos', role: 'Support Agent', department: 'Customer Service', status: 'Available', contact: '0918-234-5678' },
  { id: 3, name: 'Carlos Pineda', role: 'Fleet Manager', department: 'Management', status: 'In Meeting', contact: '0919-345-6789' },
  { id: 4, name: 'Diana Reyes', role: 'Dispatcher', department: 'Operations', status: 'On Duty', contact: '0920-456-7890' },
];

export function PersonnelTable({ searchQuery }: { searchQuery: string }) {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'role', label: 'Role' },
    { key: 'department', label: 'Department' },
    { key: 'contact', label: 'Contact' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        let variant: 'success' | 'warning' | 'danger' | 'info' = 'info';
        if (value === 'Available' || value === 'On Duty') variant = 'success';
        if (value === 'In Meeting') variant = 'warning';
        return <Badge variant={variant}>{value}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex space-x-2">
          <button className="text-blue-400 hover:text-blue-300"><Edit size={18} /></button>
          <button className="text-red-400 hover:text-red-300"><Trash size={18} /></button>
        </div>
      ),
    },
  ];

  return (
    <GlassCard className="p-4">
      <DataTable data={mockPersonnel} columns={columns} searchQuery={searchQuery} />
    </GlassCard>
  );
}