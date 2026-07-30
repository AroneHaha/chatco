// components/admin/users/users-table.tsx
import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { Modal } from '@/components/admin/ui/modal';
import { Clock, UserIcon, Mail, Phone, CreditCard, Pencil, Trash2 } from 'lucide-react';
import type { ActiveUser, RejectedUser } from '@/app/(admin)/users/data/users-data';

type User = ActiveUser | RejectedUser;

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
}

export function UsersTable({ users, searchQuery, onDeactivate, onEdit, onDelete, onViewHistory, isRejectedTab, selectedUser, onSelectUser, onRowDoubleClick }: UsersTableProps) {
  const columns = [
    {
      key: 'name',
      label: 'User',
      headerClassName: 'w-[34%] px-2 sm:px-4',
      cellClassName: 'px-2 sm:px-4 min-w-0',
      render: (value: string, item: User) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-white" title={value}>{value}</p>
          <p className="truncate text-xs text-slate-500" title={item.email}>{item.email}</p>
        </div>
      ),
    },
    {
      key: 'commuterType',
      label: 'Type',
      headerClassName: 'w-[18%] px-2 sm:px-4',
      cellClassName: 'px-2 sm:px-4',
      render: (value: string) => <Badge variant="info">{value}</Badge>,
    },
    { 
      key: 'status', 
      label: 'Status', 
      headerClassName: 'w-[16%] px-2 sm:px-4',
      cellClassName: 'px-2 sm:px-4',
      render: (value: string) => <Badge variant={value === 'Active' ? 'success' : value === 'Suspended' ? 'warning' : 'danger'}>{value}</Badge> 
    },
    ...(isRejectedTab ? [{
      key: 'rejectionReason', label: 'Reason', render: (value: string) => <span className="text-xs text-slate-400 italic">{value || 'N/A'}</span>
    }] : []),
    {
      key: 'actions',
      label: 'Actions',
      align: 'center' as const,
      headerClassName: 'w-[22%] px-2 sm:px-4',
      cellClassName: 'px-2 sm:px-4',
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
      <div>
        <DataTable
          data={users}
          columns={columns}
          searchQuery={searchQuery}
          onRowDoubleClick={onRowDoubleClick ? (item) => onRowDoubleClick(item) : undefined}
          emptyMessage={isRejectedTab ? 'No rejected users.' : 'No users found.'}
          height="32rem"
          stickyHeader
          allowHorizontalScroll={false}
          tableClassName="table-fixed"
        />
      </div>

      {/* User Details Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => onSelectUser(null)}>
        {selectedUser && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">
              Commuter Details
            </h2>

            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-sky-400/15 flex items-center justify-center text-2xl font-bold text-sky-400 border-2 border-sky-400/25 flex-shrink-0">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{selectedUser.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-slate-400">ID: {selectedUser.id}</p>
                  <Badge variant={selectedUser.status === 'Active' ? 'success' : 'warning'}>{selectedUser.status}</Badge>
                </div>
              </div>
            </div>

            {/* Contact Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

              <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                <CreditCard size={16} className="text-slate-500" />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Commuter Type</p>
                    <p className="text-sm text-white">{selectedUser.commuterType}</p>
                  </div>
                  <Badge variant="info">{selectedUser.commuterType}</Badge>
                </div>
              </div>
            </div>

            {/* ID Verification Image */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Submitted ID</h3>
              <div className="relative w-full h-44 rounded-md overflow-hidden border border-[#1E2D45] bg-black/20 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedUser.idImageUrl} alt="User ID" className="object-cover w-full h-full" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-xs text-white/70">Verified ID Document</p>
                </div>
              </div>
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
            {'role' in selectedUser && selectedUser.role === 'DRIVER' ? (
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
        )}
      </Modal>
    </>
  );
}
