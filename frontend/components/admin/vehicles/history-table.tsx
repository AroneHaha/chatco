'use client';

import { useMemo, useState } from 'react';
import { Clock, UserX } from 'lucide-react';
import { Badge } from '@/components/admin/ui/badge';
import { DataTable } from '@/components/admin/ui/data-table';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import type { ShiftLog, TerminatedPersonnel } from '@/app/(admin)/vehicles/data/vehicles-data';

interface HistoryTableProps {
  terminatedPersonnel: TerminatedPersonnel[];
  shiftHistoryLog: ShiftLog[];
  searchQuery: string;
}

const ROWS_PER_PAGE = 10;

export function HistoryTable({
  terminatedPersonnel,
  shiftHistoryLog,
  searchQuery,
}: HistoryTableProps) {
  const [historyTab, setHistoryTab] = useState<'terminated' | 'shifts'>('terminated');
  const [terminatedPage, setTerminatedPage] = useState(1);
  const [shiftPage, setShiftPage] = useState(1);
  const query = searchQuery.trim().toLowerCase();

  const filteredPersonnel = useMemo(
    () =>
      terminatedPersonnel.filter((person) =>
        [person.name, person.role, person.lastVehicle, person.reason, person.status].some((value) =>
          value.toLowerCase().includes(query),
        ),
      ),
    [terminatedPersonnel, query],
  );
  const filteredLogs = useMemo(
    () =>
      shiftHistoryLog.filter((log) =>
        [log.personnelName, log.role, log.vehicle, log.shiftDate, log.details].some((value) =>
          value.toLowerCase().includes(query),
        ),
      ),
    [shiftHistoryLog, query],
  );

  const filterKey = `${historyTab}|${query}`;
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey);
  if (filterKey !== previousFilterKey) {
    setPreviousFilterKey(filterKey);
    setTerminatedPage(1);
    setShiftPage(1);
  }

  const terminatedPages = Math.max(1, Math.ceil(filteredPersonnel.length / ROWS_PER_PAGE));
  const safeTerminatedPage = Math.min(terminatedPage, terminatedPages);
  const terminatedRows = filteredPersonnel.slice(
    (safeTerminatedPage - 1) * ROWS_PER_PAGE,
    safeTerminatedPage * ROWS_PER_PAGE,
  );

  const shiftPages = Math.max(1, Math.ceil(filteredLogs.length / ROWS_PER_PAGE));
  const safeShiftPage = Math.min(shiftPage, shiftPages);
  const shiftRows = filteredLogs.slice(
    (safeShiftPage - 1) * ROWS_PER_PAGE,
    safeShiftPage * ROWS_PER_PAGE,
  );

  const terminatedColumns = [
    {
      key: 'name',
      label: 'Personnel',
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
    { key: 'lastVehicle', label: 'Last Unit' },
    { key: 'terminatedDate', label: 'Separated On' },
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
      render: (value: TerminatedPersonnel['status']) => (
        <Badge variant={value === 'Terminated' ? 'danger' : 'warning'}>{value}</Badge>
      ),
    },
  ];

  const shiftColumns = [
    { key: 'personnelName', label: 'Personnel' },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => <Badge variant={value === 'Driver' ? 'info' : 'warning'}>{value}</Badge>,
    },
    { key: 'vehicle', label: 'Unit Number' },
    { key: 'shiftDate', label: 'Shift Date' },
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
  const activeRows = isTerminated ? terminatedRows : shiftRows;
  const activeTotal = isTerminated ? filteredPersonnel.length : filteredLogs.length;
  const activePage = isTerminated ? safeTerminatedPage : safeShiftPage;
  const activePages = isTerminated ? terminatedPages : shiftPages;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-[#1E2D45] bg-[#0E1628] p-1">
        <button
          type="button"
          onClick={() => setHistoryTab('terminated')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
            isTerminated ? 'bg-red-400/15 text-red-300' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <UserX size={14} />
          Terminated History
          <span className="rounded bg-black/20 px-1.5 py-0.5">{filteredPersonnel.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setHistoryTab('shifts')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
            !isTerminated ? 'bg-[#62A0EA]/15 text-[#62A0EA]' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Clock size={14} />
          Recent Shift History
          <span className="rounded bg-black/20 px-1.5 py-0.5">{filteredLogs.length}</span>
        </button>
      </div>

      <GlassCard className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isTerminated ? (
              <UserX size={18} className="text-red-400" />
            ) : (
              <Clock size={18} className="text-[#62A0EA]" />
            )}
            <h2 className="text-sm font-semibold text-white">
              {isTerminated ? 'Separated Personnel' : 'Recent Shift History'}
            </h2>
          </div>
          <span
            className={`rounded-md px-2 py-1 text-xs font-bold ${
              isTerminated ? 'bg-red-400/10 text-red-400' : 'bg-[#62A0EA]/10 text-[#62A0EA]'
            }`}
          >
            {activeTotal} Records
          </span>
        </div>

        {isTerminated ? (
          <DataTable
            data={terminatedRows}
            columns={terminatedColumns}
            searchQuery=""
            emptyMessage={query ? 'No separated personnel match your search.' : 'No terminated personnel records found.'}
            height="32rem"
            stickyHeader
            tableClassName="table-fixed"
          />
        ) : (
          <DataTable
            data={shiftRows}
            columns={shiftColumns}
            searchQuery=""
            emptyMessage={query ? 'No shift records match your search.' : 'No shift history records found.'}
            height="32rem"
            stickyHeader
            tableClassName="table-fixed"
          />
        )}

        <TablePagination
          currentPage={activePage}
          totalPages={activePages}
          from={activeRows.length ? (activePage - 1) * ROWS_PER_PAGE + 1 : 0}
          to={(activePage - 1) * ROWS_PER_PAGE + activeRows.length}
          total={activeTotal}
          label="records"
          onPageChange={isTerminated ? setTerminatedPage : setShiftPage}
        />
      </GlassCard>
    </div>
  );
}
