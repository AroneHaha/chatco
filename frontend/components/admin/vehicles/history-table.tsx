'use client';

import { Clock, UserX } from 'lucide-react';
import { Badge } from '@/components/admin/ui/badge';
import { DataTable } from '@/components/admin/ui/data-table';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { SearchBar } from '@/components/admin/ui/search-bar';
import type { FleetHistoryTab, PageMeta, ShiftLog, TerminatedPersonnel } from '@/app/(admin)/vehicles/data/vehicles-data';
import { SkeletonTable } from '@/components/admin/ui/skeleton';

interface HistoryTableProps {
  terminatedPersonnel: TerminatedPersonnel[];
  shiftHistoryLog: ShiftLog[];
  searchQuery: string;
  historyTab: FleetHistoryTab;
  onHistoryTabChange: (tab: FleetHistoryTab) => void;
  terminatedPage: PageMeta;
  shiftPage: PageMeta;
  onTerminatedPageChange: (page: number) => void;
  onShiftPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  counts: {
    terminated: number;
    shifts: number;
  };
  isLoading?: boolean;
}

export function HistoryTable({
  terminatedPersonnel,
  shiftHistoryLog,
  searchQuery,
  historyTab,
  onHistoryTabChange,
  terminatedPage,
  shiftPage,
  onTerminatedPageChange,
  onShiftPageChange,
  onSearchChange,
  counts,
  isLoading = false,
}: HistoryTableProps) {
  const query = searchQuery.trim().toLowerCase();

  const terminatedColumns = [
    {
      key: 'name',
      label: 'Personnel',
      cellClassName: 'min-w-0',
      render: (value: string, person: TerminatedPersonnel) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{value}</p>
          <p className="truncate text-xs text-slate-500">{person.contact || 'No contact recorded'}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => <Badge variant="info">{value}</Badge>,
    },
    { key: 'lastVehicle', label: 'Last Unit', cellClassName: 'truncate' },
    { key: 'terminatedDate', label: 'Separated On', cellClassName: 'truncate' },
    {
      key: 'reason',
      label: 'Reason',
      render: (value: string) => (
        <span className="block max-w-72 truncate text-xs text-slate-400" title={value}>
          {value || 'No reason recorded'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: 'w-28',
      cellClassName: 'w-28',
      render: (value: TerminatedPersonnel['status']) => (
        <Badge variant={value === 'Terminated' ? 'danger' : 'warning'}>{value}</Badge>
      ),
    },
  ];

  const shiftColumns = [
    { key: 'personnelName', label: 'Personnel', cellClassName: 'truncate' },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => <Badge variant={value === 'Driver' ? 'info' : 'warning'}>{value}</Badge>,
    },
    { key: 'vehicle', label: 'Unit Number', cellClassName: 'truncate' },
    { key: 'shiftDate', label: 'Shift Date', cellClassName: 'truncate' },
    {
      key: 'details',
      label: 'Activity',
      render: (value: string) => (
        <span className="block max-w-md truncate text-xs text-slate-400" title={value}>
          {value}
        </span>
      ),
    },
  ];

  const isTerminated = historyTab === 'terminated';
  const activePage = isTerminated ? terminatedPage : shiftPage;

  return (
    <div className="min-w-0 space-y-3 rounded-lg border border-[#1E2D45] bg-[#111A2B] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-[#1E2D45] bg-[#0E1628] p-1 scrollbar-themed">
        <button
          type="button"
          onClick={() => onHistoryTabChange('terminated')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
            isTerminated ? 'bg-red-400/15 text-red-300' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <UserX size={14} />
          Terminated History
          <span className="rounded bg-black/20 px-1.5 py-0.5">{counts.terminated}</span>
        </button>
        <button
          type="button"
          onClick={() => onHistoryTabChange('shifts')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
            !isTerminated ? 'bg-[#62A0EA]/15 text-[#62A0EA]' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Clock size={14} />
          Recent Shift History
          <span className="rounded bg-black/20 px-1.5 py-0.5">{counts.shifts}</span>
        </button>
      </div>
        <SearchBar
          placeholder="Search records..."
          value={searchQuery}
          onChange={onSearchChange}
          className="min-w-0 flex-1 lg:max-w-md"
        />
      </div>

      <div className="space-y-4">
        <div className="mb-4 flex justify-end">
          <span
            className={`rounded-md px-2 py-1 text-xs font-bold ${
              isTerminated ? 'bg-red-400/10 text-red-400' : 'bg-[#62A0EA]/10 text-[#62A0EA]'
            }`}
          >
            {activePage.total} Records
          </span>
        </div>

        {isLoading ? (
          <div className="h-[calc(100dvh-22rem)] min-h-64 overflow-hidden rounded-lg">
            <SkeletonTable rows={8} columns={isTerminated ? 6 : 5} />
          </div>
        ) : isTerminated ? (
          <DataTable
            data={terminatedPersonnel}
            columns={terminatedColumns}
            searchQuery=""
            emptyMessage={query ? 'No separated personnel match your search.' : 'No terminated personnel records found.'}
            height="calc(100dvh - 22rem)"
            stickyHeader
            allowHorizontalScroll={false}
            tableClassName="table-fixed"
          />
        ) : (
          <DataTable
            data={shiftHistoryLog}
            columns={shiftColumns}
            searchQuery=""
            emptyMessage={query ? 'No shift records match your search.' : 'No shift history records found.'}
            height="calc(100dvh - 22rem)"
            stickyHeader
            allowHorizontalScroll={false}
            tableClassName="table-fixed"
          />
        )}

        <TablePagination
          currentPage={activePage.currentPage}
          totalPages={activePage.totalPages}
          from={activePage.from}
          to={activePage.to}
          total={activePage.total}
          label="records"
          onPageChange={isTerminated ? onTerminatedPageChange : onShiftPageChange}
        />
      </div>
    </div>
  );
}
