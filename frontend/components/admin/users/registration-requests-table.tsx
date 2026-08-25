'use client';

import type { ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/admin/ui/badge';
import { DataTable } from '@/components/admin/ui/data-table';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import type { PendingRequest } from '@/app/(admin)/users/data/users-data';
import type { RegistrationPagination } from '@/lib/admin/services/registration.service';

function formatAppliedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface RegistrationRequestsTableProps {
  requests: PendingRequest[];
  onSelectRequest: (request: PendingRequest) => void;
  pagination: RegistrationPagination | null;
  onPageChange: (page: number) => void;
  /** Search bar + filter controls, rendered in the card header above the table. */
  headerContent?: ReactNode;
  /**
   * True while a search/filter/page-driven refetch is in flight for a tab
   * that already has data on screen. Shows a small overlay scoped to the
   * table rows only — the header (search bar, filters) and pagination stay
   * mounted and interactive instead of the whole card flashing to a skeleton.
   */
  isRefreshing?: boolean;
}

export function RegistrationRequestsTable({
  requests,
  onSelectRequest,
  pagination,
  onPageChange,
  headerContent,
  isRefreshing,
}: RegistrationRequestsTableProps) {
  const currentPage = pagination?.currentPage ?? 1;
  const totalPages = pagination?.lastPage ?? 1;
  const total = pagination?.total ?? requests.length;
  const columns = [
    {
      key: 'name',
      label: 'Applicant',
      cellClassName: 'min-w-[10rem]',
      render: (value: string, request: PendingRequest) => (
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={request.idImageUrl}
            alt=""
            className="h-9 w-9 flex-shrink-0 rounded-md border border-[#1E2D45] object-cover"
          />
          <div className="min-w-0">
            <p className="whitespace-nowrap font-medium text-white">{value}</p>
            <p className="whitespace-nowrap text-xs text-slate-500">{request.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'commuterType',
      label: 'Type',
      cellClassName: 'whitespace-nowrap',
      render: (value: string) => <Badge variant="info">{value}</Badge>,
    },
    {
      key: 'createdAt',
      label: 'Applied',
      cellClassName: 'whitespace-nowrap',
      render: (value: string) => <span className="text-xs text-slate-400">{formatAppliedDate(value)}</span>,
    },
    {
      key: 'phoneNumber',
      label: 'Contact',
      cellClassName: 'whitespace-nowrap',
      render: (value: string) => <span className="text-sm text-slate-400">{value || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      cellClassName: 'whitespace-nowrap',
      render: () => <Badge variant="warning">Pending Verification</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center' as const,
      cellClassName: 'whitespace-nowrap',
      render: (_: unknown, request: PendingRequest) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelectRequest(request);
          }}
          className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-[#62A0EA]/10 hover:text-[#62A0EA]"
        >
          <Eye size={16} />
          Review
        </button>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-lg border border-[#1E2D45] bg-[#111A2B] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      {headerContent && <div className="shrink-0">{headerContent}</div>}
      <div className="relative flex-1 min-h-0">
        <DataTable
          data={requests}
          columns={columns}
          searchQuery=""
          emptyMessage="No pending registration requests."
          height="100%"
          stickyHeader
          onRowDoubleClick={onSelectRequest}
        />
        {isRefreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-[#1E2D45] border-t-[#62A0EA] animate-spin" />
          </div>
        )}
      </div>
      <div className="shrink-0">
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          from={pagination?.from ?? (requests.length ? 1 : 0)}
          to={pagination?.to ?? requests.length}
          total={total}
          label="requests"
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
