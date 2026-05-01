'use client';

import { useState } from 'react';
import { UsersTable } from '@/components/admin/users/users-table';
import { RegistrationRequestsTable } from '@/components/admin/users/registration-requests-table';
import { ReviewRequestModal } from '@/components/admin/users/review-request-modal';
import { AddRegistrationModal } from '@/components/admin/users/add-registration-modal';
import { UserHistoryModal } from '@/components/admin/users/user-history-modal';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Plus, UserCheck, Users, XCircle } from 'lucide-react';
import {
  initialActiveUsers,
  initialPendingRequests,
  initialRejectedUsers,
  initialHistoryLogs,
  type ActiveUser,
  type PendingRequest,
  type RejectedUser,
} from './data/users-data';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'rejected'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>(initialActiveUsers);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(initialPendingRequests);
  const [rejectedUsers, setRejectedUsers] = useState<RejectedUser[]>(initialRejectedUsers);
  const [historyLogs, setHistoryLogs] = useState(initialHistoryLogs);
  
  // Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // NEW: Selected User Details State
  const [selectedUser, setSelectedUser] = useState<ActiveUser | RejectedUser | null>(null);

  const handleOpenRegisterModal = () => setIsRegisterModalOpen(true);
  const handleCloseRegisterModal = () => setIsRegisterModalOpen(false);

  const handleOpenReviewModal = (request: PendingRequest) => {
    setSelectedRequest(request);
    setIsReviewModalOpen(true);
  };
  const handleCloseReviewModal = () => {
    setSelectedRequest(null);
    setIsReviewModalOpen(false);
  };

  const handleOpenHistoryModal = (userId: string) => {
    setSelectedUserId(userId);
    setIsHistoryModalOpen(true);
  };
  const handleCloseHistoryModal = () => {
    setSelectedUserId(null);
    setIsHistoryModalOpen(false);
  };

  const handleSaveRegistration = (data: any) => {
    const newRequest = { id: `REQ-${Date.now()}`, ...data, status: 'Pending Verification' };
    setPendingRequests(prev => [newRequest, ...prev]);
    handleCloseRegisterModal();
  };

  const handleApproveRequest = () => {
    if (!selectedRequest) return;
    const newActiveUser: ActiveUser = { ...selectedRequest, id: activeUsers.length + 10, status: 'Active' };
    setActiveUsers(prev => [newActiveUser, ...prev]);
    setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
    
    setHistoryLogs(prev => ({
      ...prev,
      [newActiveUser.id]: [
        { id: `H-${Date.now()}`, date: new Date().toLocaleString(), action: 'Registration Approved', details: `Approved request ${selectedRequest.id}.` },
      ]
    }));
    handleCloseReviewModal();
  };

  const handleRejectRequest = (reason: string) => {
    if (!selectedRequest) return;
    const rejectedUser: RejectedUser = { ...selectedRequest, status: 'Rejected', rejectionReason: reason };
    setRejectedUsers(prev => [rejectedUser, ...prev]);
    setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
    handleCloseReviewModal();
  };

  const handleDeactivateUser = (userId: number) => {
    const user = activeUsers.find(u => u.id === userId);
    if (!user) return;
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    setActiveUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    setHistoryLogs(prev => ({ ...prev, [userId]: [...(prev[userId] || []), { id: `H-${Date.now()}`, date: new Date().toLocaleString(), action: 'Status Changed', details: `Account ${newStatus === 'Active' ? 'activated' : 'deactivated'}.` } ] }));
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white flex-shrink-0">Commuter Management</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <SearchBar placeholder="Search commuters..." value={searchQuery} onChange={setSearchQuery} className="w-full sm:w-64" />
          {activeTab === 'pending' && (
            <button onClick={handleOpenRegisterModal} className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors w-full sm:w-auto flex-shrink-0">
              <Plus size={20} /><span>Register Onsite</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-white/20">
        <button onClick={() => { setActiveTab('active'); setSelectedUser(null); }} className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'active' ? 'text-white border-b-2 border-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
          <UserCheck size={20} /><span>Active Commuters ({activeUsers.length})</span>
        </button>
        <button onClick={() => setActiveTab('pending')} className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'pending' ? 'text-white border-b-2 border-yellow-500 bg-yellow-500/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
          <Users size={20} /><span>Pending Verification ({pendingRequests.length})</span>
        </button>
        <button onClick={() => setActiveTab('rejected')} className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-lg transition-colors ${activeTab === 'rejected' ? 'text-white border-b-2 border-red-500 bg-red-500/10' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
          <XCircle size={20} /><span>Rejected ({rejectedUsers.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'active' && (
        <UsersTable 
          users={activeUsers} 
          searchQuery={searchQuery} 
          onDeactivate={handleDeactivateUser} 
          onViewHistory={handleOpenHistoryModal} 
          isRejectedTab={false}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
        />
      )}
      {activeTab === 'pending' && (
        <RegistrationRequestsTable requests={pendingRequests} onSelectRequest={handleOpenReviewModal} />
      )}
      {activeTab === 'rejected' && (
        <UsersTable 
          users={rejectedUsers} 
          searchQuery={searchQuery} 
          onDeactivate={() => {}} 
          onViewHistory={() => {}} 
          isRejectedTab={true}
          selectedUser={null}
          onSelectUser={() => {}}
        />
      )}

      {/* Modals */}
      <AddRegistrationModal isOpen={isRegisterModalOpen} onClose={handleCloseRegisterModal} onSave={handleSaveRegistration} />
      
      <ReviewRequestModal 
        isOpen={isReviewModalOpen} 
        onClose={handleCloseReviewModal} 
        request={selectedRequest} 
        onApprove={handleApproveRequest} 
        onReject={handleRejectRequest} 
      />

      <UserHistoryModal isOpen={isHistoryModalOpen} onClose={handleCloseHistoryModal} logs={historyLogs[selectedUserId || ''] || []} />
    </>
  );
}