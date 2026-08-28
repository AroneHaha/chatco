// components/admin/users/rejected-accounts-table.tsx
'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/admin/ui/badge';
import { DataTable } from '@/components/admin/ui/data-table';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import type { RejectedRequest } from '@/app/(admin)/users/data/users-data';
import type { RegistrationPagination } from '@/lib/admin/services/registration.service';

function formatAppliedDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface RejectedAccountsTableProps {
  requests: RejectedRequest[];
  /**
   * Opens the details modal for a row. Receives the row object straight from
   * the already-loaded page data — never triggers a fetch.
   */
  onSelectRequest: (request: RejectedRequest) => void;
  pagination: RegistrationPagination | null;
  onPageChange: (page: number) => void;
  /** Search bar + filter controls, rendered in the card header above the table. */
  headerContent?: ReactNode;
  /**
   * True while a search/filter/page-driven refetch is in flight for a tab
   * that already has data on screen. Shows a small overlay scoped to the
   * table rows only.
   */
  isRefreshing?: boolean;
}

export function RejectedAccountsTable({
  requests,
  onSelectRequest,
  pagination,
  onPageChange,
  headerContent,
  isRefreshing,
}: RejectedAccountsTableProps) {
  const currentPage = pagination?.currentPage ?? 1;
  const totalPages = pagination?.lastPage ?? 1;
  const total = pagination?.total ?? requests.length;

  const columns = [
    {
      key: 'name',
      label: 'Applicant',
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'px-2 sm:px-4 min-w-[10rem]',
      render: (value: string, request: RejectedRequest) => (
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
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'whitespace-nowrap px-2 sm:px-4',
      render: (value: string) => <Badge variant="info">{value}</Badge>,
    },
    {
      key: 'createdAt',
      label: 'Applied',
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'whitespace-nowrap px-2 sm:px-4',
      render: (value: string) => <span className="text-xs text-slate-400">{formatAppliedDate(value)}</span>,
    },
    {
      key: 'rejectionReason',
      label: 'Reason',
      // Full text, single line — the row no longer forces a fixed-width
      // ellipsis; the table scrolls horizontally instead of clipping. The
      // full text is also available in the details modal (double-click).
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'px-2 sm:px-4 max-w-xs truncate',
      render: (value: string) => (
        <span className="text-xs text-slate-400 italic" title={value}>{value || 'N/A'}</span>
      ),
    },
    {
      key: 'rejectedByName',
      label: 'Reject By',
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'px-2 sm:px-4 min-w-[10rem]',
      render: (value: string | null, request: RejectedRequest) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap text-sm text-white">{value || '—'}</p>
          {request.rejectedByEmail && (
            <p className="whitespace-nowrap text-xs text-slate-500">{request.rejectedByEmail}</p>
          )}
        </div>
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
          emptyMessage="No rejected accounts."
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
          label="rejected accounts"
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
