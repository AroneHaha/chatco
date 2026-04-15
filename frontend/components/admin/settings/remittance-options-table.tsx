// components/admin/settings/remittance-options-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Edit, Trash } from 'lucide-react';

const mockOptions = [
  { id: 1, optionName: 'Operator Juan' },
  { id: 2, optionName: 'Bank Deposit BPI' },
  { id: 3, optionName: 'Driver Pedro' },
];

export function RemittanceOptionsTable() {
  const columns = [
    { key: 'optionName', label: 'Option Name' },
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
      <DataTable data={mockOptions} columns={columns} searchQuery="" />
    </GlassCard>
  );
}