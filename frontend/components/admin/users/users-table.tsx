// components/admin/users/users-table.tsx
import type { ReactNode } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { Badge } from '@/components/admin/ui/badge';
import { Modal } from '@/components/admin/ui/modal';
import { Clock, UserIcon, Mail, Phone, CreditCard, Pencil, Trash2, AtSign, Calendar, ShieldCheck } from 'lucide-react';
import type { ActiveUser, RejectedUser } from '@/app/(admin)/users/data/users-data';

type User = ActiveUser | RejectedUser;

const ROLE_LABELS: Record<string, string> = {
  COMMUTER: 'Commuter',
  CONDUCTOR: 'Conductor',
  ADMIN: 'Admin',
  DRIVER: 'Driver',
};

function formatJoinedDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Shape shared by PaginationMeta (active) and RegistrationPagination (rejected). */
interface UsersTablePagination {
  currentPage: number;
  lastPage: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface UsersTableProps {
  users: User[];
  searchQuery: string;
  onDeactivate: (user: ActiveUser) => void;
  onEdit: (user: ActiveUser) => void;
  onDelete: (user: ActiveUser) => void;
  onViewHistory: (userId: string) => void;
  isRejectedTab: boolean;
  selectedUser: User | null;
  onSelectUser: (user: User | null) => void;
  /**
   * Optional double-click handler. Wired to the DataTable's onRowDoubleClick.
   * The parent (users/page.tsx) uses this to open the Feedback modal for
   * CONDUCTOR / DRIVER rows — other roles are ignored by the parent.
   */
  onRowDoubleClick?: (user: User) => void;
  /** Search bar + filter controls, rendered in the card header above the table. */
  headerContent?: ReactNode;
  pagination?: UsersTablePagination | null;
  onPageChange?: (page: number) => void;
  /**
   * True while a search/filter/page-driven refetch is in flight for a tab
   * that already has data on screen. Shows a small overlay scoped to the
   * table rows only — the header (search bar, filters) and pagination stay
   * mounted and interactive instead of the whole card flashing to a skeleton.
   */
  isRefreshing?: boolean;
}

export function UsersTable({ users, searchQuery, onDeactivate, onEdit, onDelete, onViewHistory, isRejectedTab, selectedUser, onSelectUser, onRowDoubleClick, headerContent, pagination, onPageChange, isRefreshing }: UsersTableProps) {
  const columns = [
    {
      key: 'name',
      label: 'User',
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'px-2 sm:px-4 min-w-[10rem]',
      render: (value: string, item: User) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap font-medium text-white">{value}</p>
          <p className="whitespace-nowrap text-xs text-slate-500">{item.email}</p>
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
      label: isRejectedTab ? 'Applied' : 'Joined',
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'whitespace-nowrap px-2 sm:px-4',
      render: (value: string | null) => <span className="text-xs text-slate-400">{formatJoinedDate(value)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'whitespace-nowrap px-2 sm:px-4',
      render: (value: string) => <Badge variant={value === 'Active' ? 'success' : value === 'Suspended' ? 'warning' : 'danger'}>{value}</Badge>
    },
    ...(isRejectedTab ? [{
      key: 'rejectionReason', label: 'Reason', cellClassName: 'whitespace-nowrap', render: (value: string) => <span className="text-xs text-slate-400 italic">{value || 'N/A'}</span>
    }] : []),
    {
      key: 'actions',
      label: 'Actions',
      align: 'center' as const,
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'whitespace-nowrap px-2 sm:px-4',
      render: (_: unknown, item: User) => (
        <div className="flex items-center justify-center space-x-1">
          {!isRejectedTab && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onSelectUser(item); }} 
                className="text-slate-400 hover:text-sky-400 p-1 rounded-md hover:bg-sky-400/10 transition-colors" 
                title="View Details"
              >
                <UserIcon size={18} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(item as ActiveUser); }} 
                className="text-slate-400 hover:text-[#62A0EA] p-1 rounded-md hover:bg-[#62A0EA]/10 transition-colors" 
                title="Edit Commuter"
              >
                <Pencil size={18} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onViewHistory(String(item.id)); }} 
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-[#1A2540] transition-colors" 
                title="View History"
              >
                <Clock size={18} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(item as ActiveUser); }} 
                className="text-slate-400 hover:text-red-400 p-1 rounded-md hover:bg-red-400/10 transition-colors" 
                title="Delete User"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-lg border border-[#1E2D45] bg-[#111A2B] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        {headerContent && <div className="shrink-0">{headerContent}</div>}
        <div className="relative flex-1 min-h-0">
          <DataTable
            data={users}
            columns={columns}
            searchQuery={searchQuery}
            onRowDoubleClick={onRowDoubleClick ? (item) => onRowDoubleClick(item) : undefined}
            emptyMessage={isRejectedTab ? 'No rejected users.' : 'No users found.'}
            height="100%"
            stickyHeader
          />
          {isRefreshing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-[#1E2D45] border-t-[#62A0EA] animate-spin" />
            </div>
          )}
        </div>
        {pagination && onPageChange && (
          <div className="shrink-0">
            <TablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.lastPage}
              from={pagination.from ?? 0}
              to={pagination.to ?? 0}
              total={pagination.total}
              label={isRejectedTab ? 'rejected users' : 'users'}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => onSelectUser(null)}>
        {selectedUser && (() => {
          const role = 'role' in selectedUser ? selectedUser.role : null;
          const roleLabel = role ? (ROLE_LABELS[role] ?? role) : 'User';
          const isCommuter = role === 'COMMUTER';
          const username = 'username' in selectedUser ? selectedUser.username : null;
          const verifiedAt = 'verifiedAt' in selectedUser ? selectedUser.verifiedAt : null;
          const createdAt = 'createdAt' in selectedUser ? selectedUser.createdAt : null;

          return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">
              {roleLabel} Details
            </h2>

            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-sky-400/15 flex items-center justify-center text-2xl font-bold text-sky-400 border-2 border-sky-400/25 flex-shrink-0">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{selectedUser.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-sm text-slate-400">ID: {selectedUser.id}</p>
                  <Badge variant={selectedUser.status === 'Active' ? 'success' : 'warning'}>{selectedUser.status}</Badge>
                  {role && <Badge variant="neutral">{roleLabel}</Badge>}
                </div>
              </div>
            </div>

            {/* Account Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {username && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <AtSign size={16} className="text-slate-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 uppercase">Username</p>
                    <p className="text-sm text-white truncate">{username}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                <Mail size={16} className="text-slate-500" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 uppercase">Email</p>
                  <p className="text-sm text-white truncate">{selectedUser.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                <Phone size={16} className="text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">Phone Number</p>
                  <p className="text-sm text-white">{selectedUser.phoneNumber}</p>
                </div>
              </div>

              {isCommuter && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <CreditCard size={16} className="text-slate-500" />
                  <div className="flex items-center justify-between w-full min-w-0">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 uppercase">Commuter Type</p>
                      <p className="text-sm text-white truncate">{selectedUser.commuterType}</p>
                    </div>
                    <Badge variant="info">{selectedUser.commuterType}</Badge>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                <Calendar size={16} className="text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500 uppercase">Joined</p>
                  <p className="text-sm text-white">{formatJoinedDate(createdAt)}</p>
                </div>
              </div>

              {verifiedAt && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <ShieldCheck size={16} className="text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Verified On</p>
                    <p className="text-sm text-white">{formatJoinedDate(verifiedAt)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            {selectedUser.status === 'Suspended' && 'suspension' in selectedUser && selectedUser.suspension && (
              <div className="rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-sm">
                <p className="font-semibold text-amber-300">
                  {selectedUser.suspension.isPermanent
                    ? 'Permanently suspended'
                    : selectedUser.suspension.endsAt
                      ? `Suspended until ${new Date(selectedUser.suspension.endsAt).toLocaleString()}`
                      : 'Suspended'}
                </p>
                <p className="mt-1 text-slate-300">{selectedUser.suspension.reason}</p>
              </div>
            )}
            {role === 'DRIVER' ? (
              <p className="rounded-md border border-[#1E2D45] bg-[#0E1628] p-3 text-center text-sm text-slate-400">
                Driver account status is managed in Fleet Management.
              </p>
            ) : (
              <button
                onClick={() => { onDeactivate(selectedUser as ActiveUser); onSelectUser(null); }}
                className={`w-full py-2.5 rounded-md text-sm font-medium transition-colors ${
                  selectedUser.status === 'Active'
                    ? 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20'
                    : 'bg-sky-400/10 text-sky-400 border border-sky-400/20 hover:bg-sky-400/20'
                }`}
              >
                {selectedUser.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
              </button>
            )}
          </div>
          );
        })()}
      </Modal>
    </>
  );
}
