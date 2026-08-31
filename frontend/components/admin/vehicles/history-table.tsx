'use client';

import { useState } from 'react';
import { Clock, UserX } from 'lucide-react';
import { Badge } from '@/components/admin/ui/badge';
import { DataTable } from '@/components/admin/ui/data-table';
import { Modal } from '@/components/admin/ui/modal';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { SearchBar } from '@/components/admin/ui/search-bar';
import type { FleetHistoryTab, FleetShiftHistoryRange, PageMeta, ShiftLog, TerminatedPersonnel } from '@/app/(admin)/vehicles/data/vehicles-data';
import { SkeletonTable } from '@/components/admin/ui/skeleton';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'Asia/Singapore',
});

function displayValue(value: string | null | undefined, fallback = 'Not recorded'): string {
  const normalized = value?.trim();
  return normalized && normalized !== '-' ? normalized : fallback;
}

function displayDate(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized === '-') return 'Not recorded';

  const date = new Date(normalized.includes('T') ? normalized : `${normalized}T00:00:00+08:00`);
  return Number.isNaN(date.getTime()) ? normalized : dateFormatter.format(date);
}

interface HistoryTableProps {
  terminatedPersonnel: TerminatedPersonnel[];
  shiftHistoryLog: ShiftLog[];
  searchQuery: string;
  historyTab: FleetHistoryTab;
  onHistoryTabChange: (tab: FleetHistoryTab) => void;
  shiftHistoryRange: FleetShiftHistoryRange;
  onShiftHistoryRangeChange: (range: FleetShiftHistoryRange) => void;
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
  shiftHistoryRange,
  onShiftHistoryRangeChange,
  terminatedPage,
  shiftPage,
  onTerminatedPageChange,
  onShiftPageChange,
  onSearchChange,
  counts,
  isLoading = false,
}: HistoryTableProps) {
  const query = searchQuery.trim().toLowerCase();
  const [selectedRecord, setSelectedRecord] = useState<TerminatedPersonnel | null>(null);
  const selectedRecordDate = selectedRecord ? displayDate(selectedRecord.terminatedDate) : '';

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
    {
      key: 'dateJoined',
      label: 'Date Joined',
      cellClassName: 'truncate',
      render: (value: string) => displayDate(value),
    },
    {
      key: 'terminatedDate',
      label: 'Separated On',
      cellClassName: 'truncate',
      render: (value: string) => displayDate(value),
    },
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

  const shiftRangeOptions: Array<{ value: FleetShiftHistoryRange; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'all_time', label: 'All Time' },
  ];

  const shiftColumns = [
    { key: 'personnelName', label: 'Personnel', cellClassName: 'truncate' },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => <Badge variant={value === 'Driver' ? 'info' : 'warning'}>{value}</Badge>,
    },
    { key: 'vehicle', label: 'Unit', cellClassName: 'truncate' },
    { key: 'shiftDate', label: 'Shift Date', cellClassName: 'truncate' },
    { key: 'timeIn', label: 'Time In', cellClassName: 'truncate font-mono text-xs' },
    {
      key: 'timeOut',
      label: 'Time Out',
      cellClassName: 'truncate font-mono text-xs',
      render: (value: string) => (
        value && value !== '-' ? value : <span className="text-slate-500">Active</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: 'w-28',
      cellClassName: 'w-28',
      render: (value: string) => (
        <Badge variant={value === 'ACTIVE' ? 'success' : value === 'ENDED' ? 'info' : 'warning'}>
          {value}
        </Badge>
      ),
    },
  ];

  const isTerminated = historyTab === 'terminated';
  const activePage = isTerminated ? terminatedPage : shiftPage;

  return (
    <>
    <div className="min-w-0 space-y-3 rounded-lg border border-[#1E2D45] bg-[#111A2B] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <SearchBar
            placeholder={isTerminated ? 'Search separated records...' : 'Search shift history...'}
            value={searchQuery}
            onChange={onSearchChange}
            className="min-w-0 w-full lg:max-w-sm"
          />
          {!isTerminated && (
            <select
              value={shiftHistoryRange}
              onChange={(event) => onShiftHistoryRangeChange(event.target.value as FleetShiftHistoryRange)}
              aria-label="Filter shift history by date range"
              className="h-10 rounded-lg border border-[#1E2D45] bg-[#0E1628] px-3 text-sm text-slate-200 outline-none transition-colors [color-scheme:dark] focus:border-[#62A0EA]/50 focus:ring-1 focus:ring-[#62A0EA]/30"
            >
              {shiftRangeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-800">
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-[#1E2D45] bg-[#0E1628] p-1 scrollbar-themed">
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
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="h-[calc(100dvh-18rem)] min-h-64 overflow-hidden rounded-lg">
            <SkeletonTable rows={8} columns={isTerminated ? 6 : 7} />
          </div>
        ) : isTerminated ? (
          <DataTable
            data={terminatedPersonnel}
            columns={terminatedColumns}
            searchQuery=""
            emptyMessage={query ? 'No separated personnel match your search.' : 'No terminated personnel records found.'}
            onRowDoubleClick={setSelectedRecord}
            height="calc(100dvh - 18rem)"
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
            height="calc(100dvh - 18rem)"
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
    <Modal isOpen={Boolean(selectedRecord)} onClose={() => setSelectedRecord(null)}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-red-400/15 p-2">
            <UserX className="text-red-300" size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-white">
              {selectedRecord ? displayValue(selectedRecord.name, 'Separated Personnel') : 'Separated Personnel'}
            </h2>
            <p className="text-sm text-slate-400">
              {selectedRecord ? `${selectedRecord.role} record separated on ${selectedRecordDate}` : 'Recorded personnel separation details.'}
            </p>
          </div>
        </div>

        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 rounded-md border border-[#1E2D45] bg-[#0E1628] p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Role</p>
                <div className="mt-1">
                  <Badge variant={selectedRecord.role === 'Driver' ? 'info' : 'warning'}>{selectedRecord.role}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Separation Type</p>
                <div className="mt-1">
                  <Badge variant={selectedRecord.status === 'Terminated' ? 'danger' : 'warning'}>
                    {selectedRecord.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Separated Date</p>
                <p className="mt-1 text-sm text-slate-200">{selectedRecordDate}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Contact</p>
                <p className="mt-1 text-sm text-slate-200">{displayValue(selectedRecord.contact)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Date Joined</p>
                <p className="mt-1 text-sm text-slate-200">{displayDate(selectedRecord.dateJoined)}</p>
              </div>
            </div>

            {selectedRecord.status === 'Terminated' && (
              <div className="rounded-md border border-red-400/20 bg-red-400/5 p-4">
                <p className="text-xs font-medium uppercase text-red-300">Reason for Termination</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {selectedRecord.reason && selectedRecord.reason !== '-' ? selectedRecord.reason : 'No reason recorded'}
                </p>
              </div>
            )}

            <div className="flex justify-end border-t border-[#1E2D45] pt-4">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-md border border-[#1E2D45] px-6 py-2.5 text-sm text-slate-300 transition-colors hover:bg-[#131C2E] active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
    </>
  );
}
