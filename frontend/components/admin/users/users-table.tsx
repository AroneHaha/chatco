import { DataTable } from '@/components/admin/ui/data-table';
import { Badge } from '@/components/admin/ui/badge';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Modal } from '@/components/admin/ui/modal';
import { Clock, UserIcon, Mail, Phone, CreditCard } from 'lucide-react';
import type { ActiveUser, RejectedUser } from '@/app/(admin)/users/data/users-data';

type User = ActiveUser | RejectedUser;

interface UsersTableProps {
  users: User[];
  searchQuery: string;
  onDeactivate: (userId: number) => void;
  onViewHistory: (userId: string) => void;
  isRejectedTab: boolean;
  selectedUser: User | null;
  onSelectUser: (user: User | null) => void;
}

export function UsersTable({ users, searchQuery, onDeactivate, onViewHistory, isRejectedTab, selectedUser, onSelectUser }: UsersTableProps) {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'commuterType', label: 'Type', render: (value: string) => <Badge variant="info">{value}</Badge> },
    { 
      key: 'status', 
      label: 'Status', 
      render: (value: string) => <Badge variant={value === 'Active' ? 'success' : value === 'Inactive' ? 'warning' : 'danger'}>{value}</Badge> 
    },
    ...(isRejectedTab ? [{
      key: 'rejectionReason', label: 'Reason', render: (value: string) => <span className="text-xs text-gray-400 italic">{value || 'N/A'}</span>
    }] : []),
    {
      key: 'actions',
      label: 'Actions',
      align: 'center' as const,
      render: (_: unknown, item: User) => (
        <div className="flex items-center justify-center space-x-1">
          {!isRejectedTab && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onSelectUser(item); }} 
                className="text-gray-400 hover:text-blue-400 p-1 rounded-md hover:bg-blue-500/10 transition-colors" 
                title="View Details"
              >
                <UserIcon size={18} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onViewHistory(String(item.id)); }} 
                className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/[0.06] transition-colors" 
                title="View History"
              >
                <Clock size={18} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <GlassCard className="p-4">
        <DataTable data={users} columns={columns} searchQuery={searchQuery} />
      </GlassCard>

      {/* User Details Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => onSelectUser(null)}>
        {selectedUser && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">
              Commuter Details
            </h2>

            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-2xl font-bold text-blue-400 border-2 border-blue-500/30 flex-shrink-0">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{selectedUser.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-400">ID: {selectedUser.id}</p>
                  <Badge variant={selectedUser.status === 'Active' ? 'success' : 'warning'}>{selectedUser.status}</Badge>
                </div>
              </div>
            </div>

            {/* Contact Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <Mail size={16} className="text-gray-500" />
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase">Email</p>
                  <p className="text-sm text-white truncate">{selectedUser.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <Phone size={16} className="text-gray-500" />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Phone Number</p>
                  <p className="text-sm text-white">{selectedUser.phoneNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <CreditCard size={16} className="text-gray-500" />
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Commuter Type</p>
                    <p className="text-sm text-white">{selectedUser.commuterType}</p>
                  </div>
                  <Badge variant="info">{selectedUser.commuterType}</Badge>
                </div>
              </div>
            </div>

            {/* ID Verification Image */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Submitted ID</h3>
              <div className="relative w-full h-44 rounded-lg overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedUser.idImageUrl} alt="User ID" className="object-cover w-full h-full" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-[10px] text-white/70">Verified ID Document</p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={() => { onDeactivate(selectedUser.id as number); onSelectUser(null); }}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedUser.status === 'Active' 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                  : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
              }`}
            >
              {selectedUser.status === 'Active' ? 'Deactivate Account' : 'Reactivate Account'}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}