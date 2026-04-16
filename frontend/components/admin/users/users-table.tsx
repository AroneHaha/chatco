// components/admin/users/users-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { ToggleLeft, ToggleRight, Clock } from 'lucide-react';

interface UsersTableProps {
  users: any[];
  searchQuery: string;
  onDeactivate: (userId: number) => void;
  onViewHistory: (userId: string) => void;
  isRejectedTab: boolean;
}

export function UsersTable({ users, searchQuery, onDeactivate, onViewHistory, isRejectedTab }: UsersTableProps) {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'commuterType', label: 'Type', render: (value: string) => <Badge variant="info">{value}</Badge> },
    { 
      key: 'status', 
      label: 'Status', 
      render: (value: string) => <Badge variant={value === 'Active' ? 'success' : value === 'Inactive' ? 'warning' : 'danger'}>{value}</Badge> 
    },
    ...(isRejectedTab ? [{
      key: 'rejectionReason', label: 'Reason', render: (value: string) => <span className="text-xs text-gray-400 italic">{value || 'N/A'}</span>
    }] : []),
    {
      key: 'actions',
      label: 'Actions',
      render: (_: unknown, item: any) => (
        <div className="flex space-x-2">
          {!isRejectedTab && (
            <>
              <button onClick={() => onViewHistory(String(item.id))} className="text-gray-400 hover:text-white" title="View History"><Clock size={18} /></button>
              <button onClick={() => onDeactivate(item.id)} className="text-yellow-400 hover:text-yellow-300" title={item.status === 'Active' ? 'Deactivate' : 'Activate'}>
                {item.status === 'Active' ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
              </button>
            </>
          )}
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