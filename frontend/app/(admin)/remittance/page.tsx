// app/(admin)/remittance/page.tsx
'use client';

import { useState } from 'react';
import { RemittanceTable } from '@/components/admin/remittance/remittance-table';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { CalendarDays } from 'lucide-react';
import type { RemittanceStatus } from '@/app/(admin)/remittance/data/remittance-data';

export default function RemittancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<RemittanceStatus | 'All'>('All'); // Quick Filter State

  const quickFilters: (RemittanceStatus | 'All')[] = ['All', 'Pending', 'Remitted'];

  return (
    <>
      <div className="flex flex-col gap-6 mb-6">
        <h1 className="text-2xl font-bold text-white">Remittance Tracker</h1>

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
            {/* Start Date Filter */}
            <div className="relative flex-1 lg:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarDays className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full lg:w-48 pl-10 pr-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] [color-scheme:dark]"
              />
            </div>

            {/* End Date Filter */}
            <div className="relative flex-1 lg:flex-none">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CalendarDays className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full lg:w-48 pl-10 pr-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] [color-scheme:dark]"
              />
            </div>

            {/* Clear Filters Button */}
            {(startDate || endDate || searchQuery || statusFilter !== 'All') && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
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

      <RemittanceTable
        searchQuery={searchQuery}
        startDate={startDate}
        endDate={endDate}
        statusFilter={statusFilter}
      />
    </>
  );
}