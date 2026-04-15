// components/admin/settings/routes-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Edit, Trash } from 'lucide-react';

const mockRoutes = [
  { id: 1, name: 'Cubao - Fairview', status: 'Active', waypoints: 'Cubao, Kamuning, Quezon Ave, Fairview' },
  { id: 2, name: 'Monumento - Baclaran', status: 'Active', waypoints: 'Monumento, Boni, Guadalupe, Buendia, Baclaran' },
  { id: 3, name: 'Quiapo - Divisoria', status: 'Inactive', waypoints: 'Quiapo, Carriedo, Divisoria' },
];

export function RoutesTable() {
  const columns = [
    { key: 'name', label: 'Route Name' },
    { key: 'waypoints', label: 'Waypoints' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => <Badge variant={value === 'Active' ? 'success' : 'danger'}>{value}</Badge>,
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
      <DataTable data={mockRoutes} columns={columns} searchQuery="" />
    </GlassCard>
  );
}