// app/(admin)/remittance/page.tsx
import { RemittanceTable } from '@/components/admin/remittance/remittance-table';

export default function RemittancePage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-6">Remittance Tracker</h1>
      <RemittanceTable />
    </>
  );
}