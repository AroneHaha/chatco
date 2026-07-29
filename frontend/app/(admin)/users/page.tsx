// app/(admin)/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { UsersTable } from '@/components/admin/users/users-table';
import { RegistrationRequestsTable } from '@/components/admin/users/registration-requests-table';
import { ReviewRequestModal } from '@/components/admin/users/review-request-modal';
import { AddRegistrationModal } from '@/components/admin/users/add-registration-modal';
import { EditUserModal } from '@/components/admin/users/edit-user-modal';
import { UserHistoryModal } from '@/components/admin/users/user-history-modal';
import { DeleteUserModal } from '@/components/admin/users/delete-user-modal';
import { FeedbackModal, type FeedbackModalStaff } from '@/components/admin/users/feedback-modal';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Plus, UserCheck, Users, XCircle, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useUsersData } from './data/users-data';
import type { ActiveUser, PendingRequest, RejectedUser } from './data/users-data';
import type { UpdateUserInput } from '@/lib/admin/services/user.service';
import { SkeletonTable } from '@/components/admin/ui/skeleton';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import { SuspensionModal } from '@/components/admin/users/suspension-modal';
import type { SuspendUserInput } from '@/lib/admin/services/user.service';
import { OperationResultModal } from '@/components/admin/ui/operation-result-modal';

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'rejected'>('active');
  const {
    activeUsers,
    pendingRequests,
    rejectedUsers,
    historyLogs,
    fetchUserActivity,
    pagination,
    pendingPagination,
    rejectedPagination,
    pendingTotal,
    rejectedTotal,
    isLoading,
    error,
    filters,
    setFilters,
    pendingType,
    setPendingType,
    setPendingPage,
    setRejectedPage,
    refetch,
    updateUserApi,
    deleteUserApi,
    approveRegistrationApi,
    rejectRegistrationApi,
    suspendUserApi,
    unsuspendUserApi,
  } = useUsersData(activeTab);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isReviewProcessing, setIsReviewProcessing] = useState(false);
  const [suspensionUser, setSuspensionUser] = useState<ActiveUser | null>(null);
  const [isSuspensionProcessing, setIsSuspensionProcessing] = useState(false);
  const [reviewResult, setReviewResult] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ActiveUser | RejectedUser | null>(null);
  const [editingUser, setEditingUser] = useState<ActiveUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ActiveUser | null>(null);
  const [feedbackStaff, setFeedbackStaff] = useState<FeedbackModalStaff | null>(null);

  // ─── Debounced search → API filter ────────────────────────────
  // The SearchBar updates `searchQuery` immediately (for responsive UX),
  // but we debounce the API call by 400ms to avoid spamming the server
  // on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchQuery });
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, setFilters]);

  // ─── Loading State ───
  // ─── Modal Handlers ───
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
    // Fetch the user's activity timeline from the backend. The result is
    // cached in historyLogs so repeat opens don't re-fetch.
    void fetchUserActivity(userId);
  };
  const handleCloseHistoryModal = () => {
    setSelectedUserId(null);
    setIsHistoryModalOpen(false);
  };

  const handleOpenEditModal = (user: ActiveUser) => {
    setEditingUser(user);
    setActionError(null);
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setEditingUser(null);
    setIsEditModalOpen(false);
  };

  const handleSaveEditUser = async (data: UpdateUserInput): Promise<void> => {
    if (!editingUser) return;
    setActionError(null);
    try {
      await updateUserApi(editingUser.id, data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user.';
      setActionError(msg);
      throw err; // re-throw so the modal can show the inline error
    }
  };

  const handleOpenDeleteModal = (user: ActiveUser) => {
    setDeletingUser(user);
    setActionError(null);
    setIsDeleteModalOpen(true);
  };
  const handleCloseDeleteModal = () => {
    setDeletingUser(null);
    setIsDeleteModalOpen(false);
  };
  const handleConfirmDelete = async (): Promise<void> => {
    if (!deletingUser) return;
    await deleteUserApi(deletingUser.id);
  };

  // ─── Feedback modal (S6-T6 revised) ────────────────────────────
  // Double-click a CONDUCTOR or DRIVER row → open the Feedback modal.
  // Other roles (COMMUTER, ADMIN) are ignored — the standalone admin
  // "Feedback QR" module was removed; feedback review now lives here.
  const handleRowDoubleClick = (user: ActiveUser | RejectedUser): void => {
    // Rejected rows don't have a role field — skip.
    if (!('role' in user)) return;
    const { id, role, name } = user as ActiveUser;
    if (role !== 'CONDUCTOR' && role !== 'DRIVER') return;
    setFeedbackStaff({ id, role, name });
    setIsFeedbackModalOpen(true);
  };
  const handleCloseFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    setFeedbackStaff(null);
  };

  // Suspend / Reactivate — toggles account_status via the API.
  const handleDeactivateUser = (user: ActiveUser): void => {
    setSuspensionUser(user);
  };

  const handleSuspendUser = async (input: SuspendUserInput): Promise<void> => {
    if (!suspensionUser) return;
    setActionError(null);
    setIsSuspensionProcessing(true);
    try {
      await suspendUserApi(suspensionUser.id, input);
      setSuspensionUser(null);
      setSuccessMessage('Account suspended and active sessions revoked.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to suspend account.');
    } finally {
      setIsSuspensionProcessing(false);
    }
  };

  const handleUnsuspendUser = async (): Promise<void> => {
    if (!suspensionUser) return;
    setActionError(null);
    setIsSuspensionProcessing(true);
    try {
      await unsuspendUserApi(suspensionUser.id);
      setSuspensionUser(null);
      setSuccessMessage('Account reactivated.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reactivate account.');
    } finally {
      setIsSuspensionProcessing(false);
    }
  };

  // ─── Registration handlers (real API) ───
  // handleSaveRegistration is async — the modal stays open with a spinner
  // until the POST resolves. On success: close + refetch + success banner.
  // On error: throw so the modal shows the message inline (modal stays open).
  const handleSaveRegistration = async (data: {
    firstName: string;
    middleInitial: string;
    lastName: string;
    birthday: string;
    username: string;
    password: string;
    email: string;
    phoneNumber: string;
    commuterType: string;
    idImageFile: File | null;
    idImagePreview: string | null;
  }): Promise<void> => {
    if (!data.idImageFile) {
      throw new Error('Please upload a valid ID image.');
    }

    // Map the modal's UI labels to the backend enum values.
    // Modal: "Regular" / "Student" / "Senior Citizen" / "PWD"
    // Backend: REGULAR / STUDENT / SENIOR / PWD
    const appliedTypeMap: Record<string, string> = {
      'Regular': 'REGULAR',
      'Student': 'STUDENT',
      'Senior Citizen': 'SENIOR',
      'PWD': 'PWD',
    };
    const appliedType = appliedTypeMap[data.commuterType] ?? 'REGULAR';

    // Build multipart form data — the proxy forwards it as multipart to
    // Laravel so $request->file('id_image') works.
    const formData = new FormData();
    formData.append('first_name', data.firstName);
    if (data.middleInitial) formData.append('middle_name', data.middleInitial);
    formData.append('surname', data.lastName);
    formData.append('birthdate', data.birthday);
    formData.append('email', data.email);
    formData.append('contact_number', data.phoneNumber);
    formData.append('username', data.username);
    formData.append('password', data.password);
    formData.append('applied_type', appliedType);
    formData.append('id_image', data.idImageFile);

    const res = await fetch('/api/admin/registrations', {
      method: 'POST',
      body: formData, // fetch() sets the multipart Content-Type + boundary automatically
      credentials: 'include',
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      // 422 validation error → surface the first field error.
      // 409 (email taken) → use the backend's message.
      // Other → use the backend's message or a generic HTTP-status fallback.
      if (res.status === 422 && body?.errors) {
        const firstField = Object.keys(body.errors)[0];
        const firstError = firstField ? body.errors[firstField]?.[0] : null;
        throw new Error(firstError ?? body?.message ?? 'Validation failed.');
      }
      throw new Error(body?.message ?? `Failed to create registration (HTTP ${res.status}).`);
    }

    // Success — close the modal, refetch the pending list, show a banner.
    handleCloseRegisterModal();
    refetch();
    setSuccessMessage(body?.message ?? 'Onsite registration created — awaiting verification.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;
    setActionError(null);
    setSuccessMessage(null);
    setIsReviewProcessing(true);
    try {
      const msg = await approveRegistrationApi(selectedRequest.id);
      handleCloseReviewModal();
      setReviewResult({
        type: 'success',
        title: 'Registration approved',
        message: msg,
      });
    } catch (err) {
      setReviewResult({
        type: 'error',
        title: 'Approval failed',
        message: err instanceof Error ? err.message : 'Failed to approve registration.',
      });
    } finally {
      setIsReviewProcessing(false);
    }
  };

  const handleRejectRequest = async (reason: string) => {
    if (!selectedRequest) return;
    setActionError(null);
    setSuccessMessage(null);
    setIsReviewProcessing(true);
    try {
      const msg = await rejectRegistrationApi(selectedRequest.id, reason);
      handleCloseReviewModal();
      setReviewResult({
        type: 'success',
        title: 'Registration rejected',
        message: msg,
      });
    } catch (err) {
      setReviewResult({
        type: 'error',
        title: 'Rejection failed',
        message: err instanceof Error ? err.message : 'Failed to reject registration.',
      });
    } finally {
      setIsReviewProcessing(false);
    }
  };

  // ─── Pagination controls ───
  const canPrev = (pagination?.currentPage ?? 1) > 1;
  const canNext = (pagination?.currentPage ?? 1) < (pagination?.lastPage ?? 1);

  // Active tab label reflects the current role filter so the badge reads
  // "Active Conductors" / "Active Drivers" / "Active Admins" / "Active Commuters"
  // instead of always saying "Active Commuters" regardless of the filter.
  const activeRoleLabel =
    filters.role === 'CONDUCTOR' ? 'Conductors' :
    filters.role === 'DRIVER' ? 'Drivers' :
    filters.role === 'ADMIN' ? 'Admins' :
    filters.role === 'COMMUTER' ? 'Commuters' :
    'Users';

  return (
    <>
      <StickyPageHeader className="mb-6">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
      </StickyPageHeader>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-6 -mt-4 md:mt-0">
          <SearchBar placeholder="Search users..." value={searchQuery} onChange={setSearchQuery} className="w-full sm:w-64" />
          {activeTab === 'active' && (
            <select
              value={filters.role ?? ''}
              onChange={(e) => setFilters({ role: e.target.value as typeof filters.role })}
              className="px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] [color-scheme:dark]"
            >
              <option value="" className="bg-gray-800">All Roles</option>
              <option value="COMMUTER" className="bg-gray-800">Commuters</option>
              <option value="CONDUCTOR" className="bg-gray-800">Conductors</option>
              <option value="DRIVER" className="bg-gray-800">Drivers</option>
              <option value="ADMIN" className="bg-gray-800">Admins</option>
            </select>
          )}
          {activeTab === 'active' && (
            <>
              <select
                value={filters.accountStatus}
                onChange={(e) => setFilters({ accountStatus: e.target.value as typeof filters.accountStatus })}
                aria-label="Filter by account status"
                className="px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] [color-scheme:dark]"
              >
                <option value="" className="bg-gray-800">All Statuses</option>
                <option value="ACTIVE" className="bg-gray-800">Active</option>
                <option value="SUSPENDED" className="bg-gray-800">Suspended</option>
              </select>
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ sort: e.target.value as typeof filters.sort })}
                aria-label="Sort users"
                className="px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] [color-scheme:dark]"
              >
                <option value="recent" className="bg-gray-800">Recent</option>
                <option value="alphabetical" className="bg-gray-800">Alphabetical</option>
                <option value="oldest" className="bg-gray-800">Oldest</option>
              </select>
              <select
                value={filters.perPage}
                onChange={(e) => setFilters({ perPage: Number(e.target.value) })}
                aria-label="Users per page"
                className="px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] [color-scheme:dark]"
              >
                <option value={10} className="bg-gray-800">10 / page</option>
                <option value={20} className="bg-gray-800">20 / page</option>
                <option value={50} className="bg-gray-800">50 / page</option>
              </select>
            </>
          )}
          {activeTab === 'pending' && (
            <select
              value={pendingType}
              onChange={(event) => setPendingType(event.target.value as typeof pendingType)}
              aria-label="Filter pending registrations by commuter type"
              className="px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm [color-scheme:dark]"
            >
              <option value="">All Types</option>
              <option value="REGULAR">Regular</option>
              <option value="STUDENT">Student</option>
              <option value="SENIOR">Senior Citizen</option>
              <option value="PWD">PWD</option>
            </select>
          )}
          <button onClick={handleOpenRegisterModal} className="flex items-center justify-center space-x-2 px-4 py-2 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors w-full sm:w-auto flex-shrink-0">
            <Plus size={20} /><span>Register Onsite</span>
          </button>
        </div>

      {/* Action error banner */}
      {actionError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center justify-between">
          <p className="text-sm text-red-400">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-300">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Success banner */}
      {successMessage && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-400">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* 3 Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-[#1E2D45] overflow-x-auto scrollbar-themed">
        <button onClick={() => { setActiveTab('active'); setSelectedUser(null); }} className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-md transition-colors ${activeTab === 'active' ? 'text-white border-b-2 border-sky-400 bg-sky-400/10' : 'text-slate-400 hover:text-white hover:bg-[#1A2540]'}`}>
          <UserCheck size={20} /><span>Active {activeRoleLabel} ({pagination?.total ?? activeUsers.length})</span>
        </button>
        <button onClick={() => setActiveTab('pending')} className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-md transition-colors ${activeTab === 'pending' ? 'text-white border-b-2 border-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-[#1A2540]'}`}>
          <Users size={20} /><span>Pending Verification ({pendingTotal})</span>
        </button>
        <button onClick={() => setActiveTab('rejected')} className={`flex items-center space-x-2 py-2 px-4 font-medium text-sm rounded-t-md transition-colors ${activeTab === 'rejected' ? 'text-white border-b-2 border-red-400 bg-red-400/10' : 'text-slate-400 hover:text-white hover:bg-[#1A2540]'}`}>
          <XCircle size={20} /><span>Rejected ({rejectedTotal})</span>
        </button>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : error ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-8">
          <AlertCircle size={36} className="text-red-400" />
          <p className="text-center font-medium text-slate-200">Unable to load this table.</p>
          <p className="max-w-xl text-center text-sm text-slate-500">{error}</p>
          <button onClick={refetch} className="flex items-center gap-2 rounded-md bg-[#62A0EA] px-4 py-2 text-sm font-medium text-white">
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : (
        <>
      {activeTab === 'active' && (
        <>
          <UsersTable
            users={activeUsers}
            searchQuery=""
            onDeactivate={handleDeactivateUser}
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteModal}
            onViewHistory={handleOpenHistoryModal}
            onRowDoubleClick={handleRowDoubleClick}
            isRejectedTab={false}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
          />
          {/* Pagination controls */}
          {pagination && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-sm text-slate-400">
                Showing {pagination.from ?? 0}–{pagination.to ?? 0} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters({ page: (pagination.currentPage - 1) })}
                  disabled={!canPrev}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className="text-sm text-slate-400 px-2">
                  Page {pagination.currentPage} of {pagination.lastPage}
                </span>
                <button
                  onClick={() => setFilters({ page: (pagination.currentPage + 1) })}
                  disabled={!canNext}
                  className="flex items-center gap-1 px-3 py-1.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {activeTab === 'pending' && (
        <RegistrationRequestsTable
          requests={pendingRequests}
          onSelectRequest={handleOpenReviewModal}
          pagination={pendingPagination}
          onPageChange={setPendingPage}
        />
      )}
      {activeTab === 'rejected' && (
        <>
          <UsersTable
            users={rejectedUsers}
            searchQuery=""
            onDeactivate={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            onViewHistory={() => {}}
            isRejectedTab={true}
            selectedUser={null}
            onSelectUser={() => {}}
          />
          {rejectedPagination && <div className="mt-4 flex items-center justify-between px-2 text-xs text-slate-500">
            <span>Showing {rejectedPagination.from ?? 0}-{rejectedPagination.to ?? 0} of {rejectedPagination.total}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setRejectedPage(rejectedPagination.currentPage - 1)} disabled={rejectedPagination.currentPage === 1} className="rounded-md border border-[#1E2D45] px-3 py-1.5 disabled:opacity-30">Previous</button>
              <span>{rejectedPagination.currentPage} / {rejectedPagination.lastPage}</span>
              <button onClick={() => setRejectedPage(rejectedPagination.currentPage + 1)} disabled={rejectedPagination.currentPage === rejectedPagination.lastPage} className="rounded-md border border-[#1E2D45] px-3 py-1.5 disabled:opacity-30">Next</button>
            </div>
          </div>}
        </>
      )}
        </>
      )}

      {/* Modals */}
      <AddRegistrationModal isOpen={isRegisterModalOpen} onClose={handleCloseRegisterModal} onSave={handleSaveRegistration} />

      <ReviewRequestModal
        key={selectedRequest?.id ?? 'closed-review'}
        isOpen={isReviewModalOpen}
        onClose={handleCloseReviewModal}
        request={selectedRequest}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        isProcessing={isReviewProcessing}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveEditUser}
        editingUser={editingUser}
      />

      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        user={deletingUser ? { name: deletingUser.name, email: deletingUser.email } : null}
      />

      <UserHistoryModal isOpen={isHistoryModalOpen} onClose={handleCloseHistoryModal} logs={historyLogs[selectedUserId || ''] || []} />

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={handleCloseFeedbackModal}
        staff={feedbackStaff}
      />

      <SuspensionModal
        key={suspensionUser?.id ?? 'closed-suspension'}
        user={suspensionUser}
        isOpen={!!suspensionUser}
        isProcessing={isSuspensionProcessing}
        onClose={() => setSuspensionUser(null)}
        onSuspend={handleSuspendUser}
        onUnsuspend={handleUnsuspendUser}
      />
      <OperationResultModal
        isOpen={reviewResult !== null}
        type={reviewResult?.type ?? 'success'}
        title={reviewResult?.title ?? ''}
        message={reviewResult?.message ?? ''}
        onClose={() => setReviewResult(null)}
      />
    </>
  );
}
