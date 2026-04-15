// components/admin/lost-found/lost-found-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { ReactNode } from 'react';

export function LostFoundTable() {
  const mockData = [
    { id: 'LF-01', item: 'Black Umbrella', reporter: 'Commuter John Doe', reporterRole: 'Commuter', status: 'Unmatched' },
    { id: 'LF-02', item: 'Green Wallet', reporter: 'Conductor Juan', reporterRole: 'Conductor', status: 'Matched' },
    { id: 'LF-03', item: 'Phone Charger', reporter: 'Commuter Jane Smith', reporterRole: 'Commuter', status: 'Returned' },
  ];

  const columns = [
    { key: 'id', label: 'Item ID' },
    { key: 'item', label: 'Description' },
    { key: 'reporter', label: 'Reporter' },
    { key: 'reporterRole', label: 'Role' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => {
        let variant: 'success' | 'warning' | 'danger' | 'info' = 'info';
        if (value === 'Returned') variant = 'success';
        if (value === 'Matched') variant = 'warning';
        if (value === 'Unmatched') variant = 'danger';
        return <Badge variant={variant}>{value}</Badge>;
      },
    },
  ];

  return (
    <GlassCard className="p-4">
      <DataTable data={mockData} columns={columns} />
    </GlassCard>
  );
}