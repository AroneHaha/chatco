'use client';

import { Eye } from 'lucide-react';
import { Badge } from '@/components/admin/ui/badge';
import { DataTable } from '@/components/admin/ui/data-table';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import type { PendingRequest } from '@/app/(admin)/users/data/users-data';
import type { RegistrationPagination } from '@/lib/admin/services/registration.service';

interface RegistrationRequestsTableProps {
  requests: PendingRequest[];
  onSelectRequest: (request: PendingRequest) => void;
  pagination: RegistrationPagination | null;
  onPageChange: (page: number) => void;
}

export function RegistrationRequestsTable({
  requests,
  onSelectRequest,
  pagination,
  onPageChange,
}: RegistrationRequestsTableProps) {
  const currentPage = pagination?.currentPage ?? 1;
  const totalPages = pagination?.lastPage ?? 1;
  const total = pagination?.total ?? requests.length;
  const columns = [
    {
      key: 'name',
      label: 'Applicant',
      render: (value: string, request: PendingRequest) => (
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={request.idImageUrl}
            alt=""
            className="h-9 w-9 flex-shrink-0 rounded-md border border-[#1E2D45] object-cover"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{value}</p>
            <p className="truncate text-xs text-slate-500">{request.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'commuterType',
      label: 'Type',
      render: (value: string) => <Badge variant="info">{value}</Badge>,
    },
    {
      key: 'phoneNumber',
      label: 'Contact',
      render: (value: string) => <span className="text-sm text-slate-400">{value || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: () => <Badge variant="warning">Pending Verification</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'center' as const,
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
    <div className="space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Pending Verification</h2>
        <span className="rounded-md bg-amber-400/10 px-2 py-1 text-xs font-bold text-amber-300">
          {total} Records
        </span>
      </div>
      <DataTable
        data={requests}
        columns={columns}
        searchQuery=""
        emptyMessage="No pending registration requests."
        height="32rem"
        stickyHeader
        tableClassName="table-fixed"
        onRowDoubleClick={onSelectRequest}
      />
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
  );
}
