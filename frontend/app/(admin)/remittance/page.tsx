// app/(admin)/remittance/page.tsx
'use client';

import { useState } from 'react';
import { RemittanceTable } from '@/components/admin/remittance/remittance-table';
import { RemittanceSummary } from '@/components/admin/remittance/remittance-summary';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { CalendarDays } from 'lucide-react';
import type { RemittanceStatus } from '@/app/(admin)/remittance/data/remittance-data';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';

export default function RemittancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<RemittanceStatus | 'All'>('All'); // Quick Filter State

  const quickFilters: (RemittanceStatus | 'All')[] = ['All', 'Pending', 'Overdue', 'Remitted', 'Shortage', 'Overage'];

  return (
    // touch-action: manipulation prevents mobile double-tap ghost clicks
    <div style={{ touchAction: 'manipulation' }}>
      {/* Title pins on phones; the summary and status filters below stay in the
          scroll flow so the bar doesn't dominate a small screen.

          Deliberately a direct child of the page root, NOT of the filter block
          below: a sticky element only stays pinned while its containing block
          is on screen, so nesting it in that short wrapper would have released
          the title as soon as the filters scrolled past — long before the
          remittance table, which is exactly where the title matters most. */}
      <StickyPageHeader className="mb-6">
        <h1 className="text-2xl font-bold text-white">Remittance Tracker</h1>
      </StickyPageHeader>

      <div className="flex flex-col gap-6 mb-6">
        <RemittanceSummary selectedDate={selectedDate} />

        {/* Quick Status Filters */}
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === filter
                  ? 'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/25'
                  : 'bg-[#0E1628] border border-[#1E2D45] text-slate-300 hover:bg-[#1A2540]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Search & Date Filters Row */}
        <div className="flex flex-col lg:flex-row gap-3 w-full">
          <SearchBar
            placeholder="Search by Conductor or ID..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full lg:w-64"
          />

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarDays className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Filter remittances by date"
                className="block w-full lg:w-48 pl-10 pr-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] [color-scheme:dark]"
              />
            </div>

            {/* Clear Filters Button */}
            {(selectedDate || searchQuery || statusFilter !== 'All') && (
              <button
                onClick={() => {
                  setSelectedDate('');
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="px-4 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#1A2540] transition-colors text-sm w-full sm:w-auto"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-[#0B1220] border border-[#1E2D45] rounded-xl p-4 sm:p-5">
        <RemittanceTable
          searchQuery={searchQuery}
          selectedDate={selectedDate}
          statusFilter={statusFilter}
        />
      </div>
    </div>
  );
}
