// app/(admin)/remittance/page.tsx
'use client';

import { useState } from 'react';
import { RemittanceTable } from '@/components/admin/remittance/remittance-table';
import { SearchBar } from '@/components/admin/ui/search-bar';

export default function RemittancePage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white">Remittance Tracker</h1>
        <SearchBar
          placeholder="Search remittances..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:w-64"
        />
      </div>

      <RemittanceTable searchQuery={searchQuery} />
    </>
  );
}