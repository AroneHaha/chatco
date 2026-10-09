// components/admin/users/users-table.tsx
import type { ReactNode } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { RowActionsMenu } from '@/components/admin/ui/row-actions-menu';
import { Badge } from '@/components/admin/ui/badge';
import { Modal } from '@/components/admin/ui/modal';
import { UserIcon, Mail, Phone, CreditCard, Pencil, Trash2, AtSign, Calendar, ShieldCheck, UserRound, Tag, BusFront, CarFront, type LucideIcon } from 'lucide-react';
import type { ActiveUser, RejectedUser } from '@/app/(admin)/users/data/users-data';
import styles from './commuter-details.module.css';

type User = ActiveUser | RejectedUser;

const ROLE_LABELS: Record<string, string> = {
  COMMUTER: 'Commuter',
  CONDUCTOR: 'Conductor',
  ADMIN: 'Admin',
  DRIVER: 'Driver',
};

// Type column: a muted icon per role so rows scan without looking clickable.
// Discounted commuter types (Student, Senior Citizen, PWD) share the tag icon.
const ROLE_ICONS: Record<string, LucideIcon> = {
  ADMIN: ShieldCheck,
  CONDUCTOR: BusFront,
  DRIVER: CarFront,
};

// Status column: dot + label, same treatment as Fleet Management's Personnel table.
const STATUS_DOT: Record<string, string> = {
  Active: 'bg-emerald-400',
  Suspended: 'bg-amber-400',
  Disabled: 'bg-slate-600',
  Rejected: 'bg-red-400',
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
  /** Conductor rows: Disable Account (conductors are never suspended). */
  onDisableConductor: (user: ActiveUser) => void;
  onEdit: (user: ActiveUser) => void;
  onDelete: (user: ActiveUser) => void;
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

export function UsersTable({ users, searchQuery, onDeactivate, onDisableConductor, onEdit, onDelete, isRejectedTab, selectedUser, onSelectUser, onRowDoubleClick, headerContent, pagination, onPageChange, isRefreshing }: UsersTableProps) {
  const columns = [
    {
      key: 'name',
      label: 'User',
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'px-2 sm:px-4 min-w-[10rem]',
      render: (value: string, item: User) => {
        const profile = 'role' in item && item.role === 'COMMUTER' ? item._raw : undefined;
        const middleInitials = profile?.middleName?.trim().split(/\s+/).map((name) => name.charAt(0)).join('').toUpperCase();
        const displayName = profile?.firstName && profile.lastName
          ? [profile.firstName, middleInitials || null, profile.lastName].filter(Boolean).join(' ')
          : value;
        return (
          <div className="min-w-0">
            <p className="whitespace-nowrap font-medium text-white">{displayName}</p>
            <p className="whitespace-nowrap text-xs text-slate-500">{item.email}</p>
          </div>
        );
      },
    },
    ...(!isRejectedTab ? [
      {
        key: 'username',
        label: 'Username',
        headerClassName: 'px-2 sm:px-4',
        cellClassName: 'whitespace-nowrap px-2 sm:px-4',
        render: (value: string | null) => <span className="text-sm text-slate-300">{value || '—'}</span>,
      },
      {
        key: 'phoneNumber',
        label: 'Contact',
        headerClassName: 'px-2 sm:px-4',
        cellClassName: 'whitespace-nowrap px-2 sm:px-4',
        render: (value: string) => <span className="text-sm text-slate-400">{value || '—'}</span>,
      },
    ] : []),
    {
      key: 'commuterType',
      label: 'Type',
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'whitespace-nowrap px-2 sm:px-4',
      // Commuters show their fare type; every other role has none, so the
      // column shows the role itself (Admin, Conductor, Driver).
      render: (value: string, item: User) => {
        const role = 'role' in item ? item.role : 'COMMUTER';
        const isCommuter = role === 'COMMUTER';
        const Icon = isCommuter ? (value === 'Regular' ? UserRound : Tag) : (ROLE_ICONS[role] ?? UserRound);
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
            <Icon size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
            {isCommuter ? value : (ROLE_LABELS[role] ?? role)}
          </span>
        );
      },
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
      render: (value: string) => (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[value] ?? 'bg-slate-600'}`} />
          <span className={`text-xs font-medium ${value === 'Active' ? 'text-slate-300' : 'text-slate-400'}`}>{value}</span>
        </span>
      )
    },
    ...(isRejectedTab ? [{
      key: 'rejectionReason', label: 'Reason', cellClassName: 'whitespace-nowrap', render: (value: string) => <span className="text-xs text-slate-400 italic">{value || 'N/A'}</span>
    }] : []),
    {
      key: 'actions',
      label: 'Actions',
      align: 'center' as const,
      headerClassName: 'w-20 px-2 sm:px-4',
      cellClassName: 'w-20 whitespace-nowrap px-2 sm:px-4',
      render: (_: unknown, item: User) => !isRejectedTab ? (
        <RowActionsMenu
          label={`Actions for ${item.name}`}
          actions={[
            { label: 'View Details', icon: UserIcon, onSelect: () => onSelectUser(item) },
            { label: 'Edit', icon: Pencil, onSelect: () => onEdit(item as ActiveUser) },
            { label: 'Delete', icon: Trash2, onSelect: () => onDelete(item as ActiveUser), tone: 'danger' },
          ]}
        />
      ) : null,
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
            mobileCards
          />
          {isRefreshing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full border-2 border-[#1E2D45] border-t-[#62A0EA] animate-spin" />
            </div>
          )}
        </div>
        {pagination && onPageChange && (
          <div className="shrink-0 [&_button]:min-h-11 [&_button]:min-w-11 md:[&_button]:min-h-0 md:[&_button]:min-w-0">
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
      <Modal isOpen={!!selectedUser} onClose={() => onSelectUser(null)} maxWidth={selectedUser && 'role' in selectedUser && selectedUser.role === 'COMMUTER' ? 'max-w-md lg:max-w-2xl' : 'max-w-md'}>
        {selectedUser && (() => {
          const role = 'role' in selectedUser ? selectedUser.role : null;
          const roleLabel = role ? (ROLE_LABELS[role] ?? role) : 'User';
          const isCommuter = role === 'COMMUTER';
          const username = 'username' in selectedUser ? selectedUser.username : null;
          const verifiedAt = 'verifiedAt' in selectedUser ? selectedUser.verifiedAt : null;
          const createdAt = 'createdAt' in selectedUser ? selectedUser.createdAt : null;

          return (
          <div className={`space-y-6 ${isCommuter ? styles.commuter : ''}`}>
            <div className={styles.header}>
            <h2 className="text-xl font-bold text-white">
              {roleLabel} Details
            </h2>
            {isCommuter && <p className="hidden lg:block mt-1 text-sm text-slate-400">Account information and access status</p>}
            </div>

            {/* Profile Header */}
            <div className={`flex items-center gap-4 ${styles.profile}`}>
              <div className={`w-16 h-16 rounded-full bg-sky-400/15 flex items-center justify-center text-2xl font-bold text-sky-400 border-2 border-sky-400/25 flex-shrink-0 ${styles.avatar}`}>
                {selectedUser.name.charAt(0)}
              </div>
              <div className={styles.identity}>
                <p className={`text-lg font-bold text-white ${styles.name}`}>{selectedUser.name}</p>
                <div className={`flex flex-wrap items-center gap-2 mt-1 ${styles.profileMeta}`}>
                  <p className={`text-sm text-slate-400 ${styles.accountId}`}>ID: {selectedUser.id}</p>
                  <Badge variant={selectedUser.status === 'Active' ? 'success' : selectedUser.status === 'Suspended' ? 'warning' : 'danger'}>{selectedUser.status}</Badge>
                  {role && <Badge variant="neutral">{roleLabel}</Badge>}
                </div>
              </div>
            </div>

            {/* Account Info Grid */}
            <div>
            {isCommuter && <h3 className="hidden lg:flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-300"><UserRound size={14} className="text-[#62A0EA]" aria-hidden="true" />Account information</h3>}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${styles.information}`}>
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
            </div>

            {/* Action Button */}
            {selectedUser.status === 'Suspended' && 'suspension' in selectedUser && selectedUser.suspension && (
              <div className={`rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-sm ${styles.suspension}`}>
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
            <div className={`flex gap-2 ${styles.actions}`}>
              <button
                onClick={() => { onEdit(selectedUser as ActiveUser); onSelectUser(null); }}
                className={`flex-1 py-2.5 rounded-md text-sm font-medium bg-[#62A0EA]/10 text-[#62A0EA] border border-[#62A0EA]/20 hover:bg-[#62A0EA]/20 transition-colors ${styles.editAction}`}
              >
                Edit {roleLabel}
              </button>
              {role === 'CONDUCTOR' && selectedUser.status === 'Active' && (
                <button
                  onClick={() => { onDisableConductor(selectedUser as ActiveUser); onSelectUser(null); }}
                  className="flex-1 py-2.5 rounded-md text-sm font-medium transition-colors bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20"
                >
                  Disable Account
                </button>
              )}
              {role !== 'DRIVER' && role !== 'CONDUCTOR' && (
                <button
                  onClick={() => { onDeactivate(selectedUser as ActiveUser); onSelectUser(null); }}
                  className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    selectedUser.status === 'Active'
                      ? 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20'
                      : 'bg-sky-400/10 text-sky-400 border border-sky-400/20 hover:bg-sky-400/20'
                  }`}
                >
                  {selectedUser.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
                </button>
              )}
            </div>
            {role === 'CONDUCTOR' && selectedUser.status === 'Disabled' && (
              <p className="rounded-md border border-[#1E2D45] bg-[#0E1628] p-3 text-center text-sm text-slate-400">
                This conductor is disabled. Reset their credentials in Fleet Management to re-enable the account.
              </p>
            )}
            {role === 'DRIVER' && (
              <p className="rounded-md border border-[#1E2D45] bg-[#0E1628] p-3 text-center text-sm text-slate-400">
                Driver account status is managed in Fleet Management.
              </p>
            )}
          </div>
          );
        })()}
      </Modal>
    </>
  );
}
