// components/admin/users/users-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Edit, ToggleLeft, ToggleRight } from 'lucide-react';

interface UsersTableProps {
  users: any[];
  searchQuery: string;
  onEdit: (user: any) => void;
  onDeactivate: (userId: number) => void;
}

export function UsersTable({ users, searchQuery, onEdit, onDeactivate }: UsersTableProps) {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => {
        let variant: 'success' | 'warning' | 'danger' | 'info' = 'info';
        if (value === 'Commuter') variant = 'info';
        if (value === 'Conductor') variant = 'warning';
        if (value === 'Driver') variant = 'success';
        return <Badge variant={variant}>{value}</Badge>;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => <Badge variant={value === 'Active' ? 'success' : 'danger'}>{value}</Badge>,
    },
    { key: 'languagePreference', label: 'Language' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, item: any) => (
        <div className="flex space-x-2">
          <button onClick={() => onEdit(item)} className="text-blue-400 hover:text-blue-300"><Edit size={18} /></button>
          <button onClick={() => onDeactivate(item.id)} className="text-yellow-400 hover:text-yellow-300" title={item.status === 'Active' ? 'Deactivate' : 'Activate'}>
            {item.status === 'Active' ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <GlassCard className="p-4">
      <DataTable data={users} columns={columns} searchQuery={searchQuery} />
    </GlassCard>
  );
}