// components/admin/users/users-table.tsx
import type { ReactNode } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { RowActionsMenu } from '@/components/admin/ui/row-actions-menu';
import { Modal } from '@/components/admin/ui/modal';
import { UserAvatar } from '@/components/admin/ui/user-avatar';
import { UserIcon, Pencil, Trash2, ShieldCheck, ShieldAlert, UserRound, BusFront, CarFront, type LucideIcon } from 'lucide-react';
import type { ActiveUser, RejectedUser } from '@/app/(admin)/users/data/users-data';
import styles from './commuter-details.module.css';
import { StatusReasonHint } from './status-reason-hint';
import { CommuterTypeLabel } from './commuter-type-label';

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
  'For Renewal': 'bg-yellow-400',
  Suspended: 'bg-amber-400',
  Disabled: 'bg-slate-600',
  Rejected: 'bg-red-400',
};

function displayStatus(user: User): string {
  return user.status === 'Active' && 'role' in user && user.role === 'COMMUTER' && user._raw?.studentRenewalRequired
    ? 'For Renewal'
    : user.status;
}

function formatJoinedDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Small amber "?" on the commuter's photo; hovering (or tapping, for touch)
 * reveals why and until when the account is suspended.
 */
function SuspensionHint({ suspension }: { suspension: NonNullable<ActiveUser['suspension']> }) {
  const title = suspension.isPermanent
    ? 'Permanently suspended'
    : suspension.endsAt
      ? `Suspended until ${new Date(suspension.endsAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`
      : 'Suspended';

  return <StatusReasonHint title={title} reason={suspension.reason} label="Why this account is suspended" />;
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
   * Optional double-click handler, wired to the DataTable's onRowDoubleClick.
   * The parent uses it to open the selected user's details modal.
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
    ...(!isRejectedTab ? [{
      // Unlabelled photo column; next/image serves a ~36px copy from R2.
      key: 'profileImageUrl',
      label: '',
      headerClassName: 'w-12 pl-2 pr-0 sm:pl-4',
      cellClassName: 'w-12 pl-2 pr-0 sm:pl-4',
      cardLead: true,
      render: (value: string | null, item: User) => (
        <UserAvatar src={value} alt={`Profile photo of ${item.name}`} className="h-9 w-9" iconClassName="h-4 w-4" sizes="36px" />
      ),
    }] : []),
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
            <p className="whitespace-nowrap font-medium text-white admin-light:text-slate-900">{displayName}</p>
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
        render: (value: string | null) => <span className="text-sm text-slate-300 admin-light:text-slate-700">{value || '—'}</span>,
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
        if (role === 'COMMUTER') return <CommuterTypeLabel type={value} />;
        const Icon = ROLE_ICONS[role] ?? UserRound;
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-300 admin-light:text-slate-700">
            <Icon size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
            {ROLE_LABELS[role] ?? role}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: isRejectedTab ? 'Applied' : 'Joined',
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'whitespace-nowrap px-2 sm:px-4',
      render: (value: string | null) => <span className="text-xs text-slate-400 admin-light:text-slate-500">{formatJoinedDate(value)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: 'px-2 sm:px-4',
      cellClassName: 'whitespace-nowrap px-2 sm:px-4',
      render: (_value: string, item: User) => (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[displayStatus(item)] ?? 'bg-slate-600'}`} />
          <span className={`text-xs font-medium ${item.status === 'Active' ? 'text-slate-300 admin-light:text-slate-700' : 'text-slate-400 admin-light:text-slate-500'}`}>{displayStatus(item)}</span>
        </span>
      )
    },
    ...(isRejectedTab ? [{
      key: 'rejectionReason', label: 'Reason', cellClassName: 'whitespace-nowrap', render: (value: string) => <span className="text-xs text-slate-400 admin-light:text-slate-500 italic">{value || 'N/A'}</span>
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
            ...('role' in item && item.role !== 'DRIVER' && item.role !== 'CONDUCTOR' ? [{
              label: item.status === 'Active' ? 'Suspend Account' : 'Reactivate Account',
              icon: item.status === 'Active' ? ShieldAlert : ShieldCheck,
              onSelect: () => onDeactivate(item as ActiveUser),
              tone: item.status === 'Active' ? 'danger' as const : 'default' as const,
            }] : []),
            { label: 'Delete', icon: Trash2, onSelect: () => onDelete(item as ActiveUser), tone: 'danger' },
          ]}
        />
      ) : null,
    },
  ];

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#111A2B] admin-light:bg-white p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
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
              <div className="h-8 w-8 rounded-full border-2 border-[#1E2D45] admin-light:border-[#E2E8F0] border-t-[#62A0EA] admin-light:border-t-[#1A5FB4] animate-spin" />
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
      <Modal adminThemed isOpen={!!selectedUser} onClose={() => onSelectUser(null)} maxWidth={selectedUser && 'role' in selectedUser && selectedUser.role === 'COMMUTER' ? 'max-w-md sm:max-w-3xl' : 'max-w-md sm:max-w-2xl'}>
        {selectedUser && (() => {
          const role = 'role' in selectedUser ? selectedUser.role : null;
          const roleLabel = role ? (ROLE_LABELS[role] ?? role) : 'User';
          const isCommuter = role === 'COMMUTER';
          const username = 'username' in selectedUser ? selectedUser.username : null;
          const verifiedAt = 'verifiedAt' in selectedUser ? selectedUser.verifiedAt : null;
          const createdAt = 'createdAt' in selectedUser ? selectedUser.createdAt : null;
          const profile = isCommuter && '_raw' in selectedUser ? selectedUser._raw : undefined;
          const registrationDetails = [
            { label: 'First name', value: profile?.firstName },
            { label: 'Middle name', value: profile?.middleName },
            { label: 'Last name', value: profile?.lastName },
            { label: 'Suffix', value: profile?.suffix },
            { label: 'Birthdate', value: profile?.dateOfBirth ? formatJoinedDate(profile.dateOfBirth) : null },
            { label: 'Gender', value: profile?.gender },
          ];

          if (isCommuter) {
            const suspension = 'suspension' in selectedUser ? selectedUser.suspension : null;
            const status = displayStatus(selectedUser);
            const commuterType = selectedUser.commuterType && selectedUser.commuterType !== '—' ? selectedUser.commuterType : null;
            return (
              <div className={styles.sheet}>
                <aside className={styles.rail} aria-label="Commuter identity">
                  <div className={styles.railIdentity}>
                    <span className="relative shrink-0">
                      <UserAvatar src={profile?.profileImageUrl} alt={`Profile photo of ${selectedUser.name}`} className="h-14 w-14 sm:h-22 sm:w-22" iconClassName="h-6 w-6 sm:h-9 sm:w-9" />
                      {selectedUser.status === 'Suspended' && suspension && <SuspensionHint suspension={suspension} />}
                    </span>
                    <div className={styles.railIdentityText}>
                      <h2 className={styles.kicker}>Commuter Details</h2>
                      <p className={styles.personName}>{selectedUser.name}</p>
                      <p className={styles.personMeta}>
                        <span>
                          {status}
                        </span>
                        {commuterType && <span>{commuterType}</span>}
                      </p>
                    </div>
                  </div>

                  <dl className={styles.timeline}>
                    <div><dt>Joined</dt><dd>{formatJoinedDate(createdAt)}</dd></div>
                    <div><dt>Verified on</dt><dd className={verifiedAt ? undefined : styles.muted}>{verifiedAt ? formatJoinedDate(verifiedAt) : 'Not verified'}</dd></div>
                  </dl>
                </aside>

                <div className={styles.record}>

                  <section className={styles.recordSection}>
                    <h3 className={styles.sectionTitle}>Personal information</h3>
                    <dl className={styles.fieldGrid}>
                      {registrationDetails.map(detail => (
                        <div key={detail.label} className={styles.field}>
                          <dt>{detail.label}</dt>
                          <dd className={detail.value ? undefined : styles.muted}>{detail.value || 'Not provided'}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <section className={styles.recordSection}>
                    <h3 className={styles.sectionTitle}>Contact and account</h3>
                    <dl className={styles.fieldRows}>
                      <div className={styles.field}><dt>Username</dt><dd className={username ? undefined : styles.muted}>{username || 'Not provided'}</dd></div>
                      <div className={styles.field}><dt>Email</dt><dd>{selectedUser.email}</dd></div>
                      <div className={styles.field}><dt>Phone number</dt><dd>{selectedUser.phoneNumber}</dd></div>
                    </dl>
                  </section>

                  <section className={styles.recordSection}>
                    <h3 className={styles.sectionTitle}>Uploaded ID</h3>
                    {selectedUser.idImageUrl ? (
                      <div className={styles.idRow}>
                        <a href={selectedUser.idImageUrl} target="_blank" rel="noopener noreferrer" className={styles.idThumb} aria-label={`Open the uploaded ID for ${selectedUser.name} in a new tab`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={selectedUser.idImageUrl} alt="" loading="lazy" />
                        </a>
                        <a href={selectedUser.idImageUrl} target="_blank" rel="noopener noreferrer" className={styles.idLink}>View full-size ID</a>
                      </div>
                    ) : <p className={styles.idEmpty}>No ID uploaded.</p>}
                  </section>
                </div>

                <footer className={styles.sheetActions}>
                  <button type="button" onClick={() => { onEdit(selectedUser as ActiveUser); onSelectUser(null); }} className={styles.actionEdit}>Edit Commuter</button>
                  <button type="button" onClick={() => { onDeactivate(selectedUser as ActiveUser); onSelectUser(null); }} className={selectedUser.status === 'Active' ? styles.actionSuspend : styles.actionReactivate}>
                    {selectedUser.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
                  </button>
                </footer>
              </div>
            );
          }

          // Admin / conductor / driver: the same identity-rail sheet as the
          // commuter view above, with fewer fields.
          const suspension = 'suspension' in selectedUser ? selectedUser.suspension : null;
          const contactRows = [
            ...(username ? [{ label: 'Username', value: username }] : []),
            { label: 'Email', value: selectedUser.email },
            { label: 'Phone number', value: selectedUser.phoneNumber },
          ];
          return (
            <div className={styles.sheet}>
              <aside className={styles.rail} aria-label={`${roleLabel} identity`}>
                <div className={styles.railIdentity}>
                  <UserAvatar src={'profileImageUrl' in selectedUser ? selectedUser.profileImageUrl : null} alt={`Profile photo of ${selectedUser.name}`} className="h-14 w-14 shrink-0 sm:h-22 sm:w-22" iconClassName="h-6 w-6 sm:h-9 sm:w-9" />
                  <div className={styles.railIdentityText}>
                    <h2 className={styles.kicker}>{roleLabel} details</h2>
                    <p className={styles.personName}>{selectedUser.name}</p>
                    <p className={styles.personMeta}>
                      <span>{selectedUser.status}</span>
                      <span>{roleLabel}</span>
                    </p>
                  </div>
                </div>
                <dl className={styles.timeline}>
                  <div><dt>Joined</dt><dd>{formatJoinedDate(createdAt)}</dd></div>
                  {verifiedAt && <div><dt>Verified on</dt><dd>{formatJoinedDate(verifiedAt)}</dd></div>}
                </dl>
              </aside>

              <div className={styles.record}>
                <section className={styles.recordSection}>
                  <h3 className={styles.sectionTitle}>Contact and account</h3>
                  <dl className={styles.fieldRows}>
                    {contactRows.map(row => (
                      <div key={row.label} className={styles.field}><dt>{row.label}</dt><dd>{row.value}</dd></div>
                    ))}
                  </dl>
                </section>

                {selectedUser.status === 'Suspended' && suspension && (
                  <section className={styles.recordSection}>
                    <h3 className={styles.sectionTitle}>Suspension</h3>
                    <p className="text-sm font-semibold text-white admin-light:text-slate-900">
                      {suspension.isPermanent
                        ? 'Permanently suspended'
                        : suspension.endsAt
                          ? `Suspended until ${new Date(suspension.endsAt).toLocaleString()}`
                          : 'Suspended'}
                    </p>
                    <p className="mt-1 text-sm text-slate-300 admin-light:text-slate-700">{suspension.reason}</p>
                  </section>
                )}

                {role === 'CONDUCTOR' && selectedUser.status === 'Disabled' && (
                  <p className="text-sm text-slate-400 admin-light:text-slate-500">This conductor is disabled. Reset their credentials in Fleet Management to re-enable the account.</p>
                )}
                {role === 'DRIVER' && (
                  <p className="text-sm text-slate-400 admin-light:text-slate-500">Driver account status is managed in Fleet Management.</p>
                )}
              </div>

              <footer className={styles.sheetActions}>
                <button type="button" onClick={() => { onEdit(selectedUser as ActiveUser); onSelectUser(null); }} className={styles.actionEdit}>Edit {roleLabel}</button>
                {role === 'CONDUCTOR' && selectedUser.status === 'Active' && (
                  <button type="button" onClick={() => { onDisableConductor(selectedUser as ActiveUser); onSelectUser(null); }} className={styles.actionSuspend}>Disable account</button>
                )}
                {role !== 'DRIVER' && role !== 'CONDUCTOR' && (
                  <button type="button" onClick={() => { onDeactivate(selectedUser as ActiveUser); onSelectUser(null); }} className={selectedUser.status === 'Active' ? styles.actionSuspend : styles.actionReactivate}>
                    {selectedUser.status === 'Active' ? 'Suspend account' : 'Reactivate account'}
                  </button>
                )}
              </footer>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}
