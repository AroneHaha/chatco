import { RemittanceTable } from '@/components/admin/remittance/remittance-table';

export default function RemittancePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Remittance Tracker</h1>
      <div className="bg-white rounded-lg shadow">
        <RemittanceTable />
      </div>
    </div>
  );
}