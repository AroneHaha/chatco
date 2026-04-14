import { LostFoundTable } from '@/components/admin/lost-found/lost-found-table';

export default function LostFoundPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Lost & Found Management</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <LostFoundTable />
      </div>
    </div>
  );
}