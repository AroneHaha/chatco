// app/(admin)/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UsersTable } from '@/components/admin/users/users-table';
import { RegistrationRequestsTable } from '@/components/admin/users/registration-requests-table';
import { RejectedAccountsTable } from '@/components/admin/users/rejected-accounts-table';
import { RejectedAccountDetailsModal } from '@/components/admin/users/rejected-account-details-modal';
import { ReviewRequestModal } from '@/components/admin/users/review-request-modal';
import { AddRegistrationModal } from '@/components/admin/users/add-registration-modal';
import { EditUserModal } from '@/components/admin/users/edit-user-modal';
import { UserHistoryModal } from '@/components/admin/users/user-history-modal';
import { DeleteUserModal } from '@/components/admin/users/delete-user-modal';
import { FeedbackModal, type FeedbackModalStaff } from '@/components/admin/users/feedback-modal';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Plus, UserCheck, Users, XCircle, AlertCircle, RefreshCw, CheckCircle, ChevronUp } from 'lucide-react';
import { useUsersData } from './data/users-data';
import type { ActiveUser, PendingRequest, RejectedUser, RejectedRequest } from './data/users-data';
import type { UpdateUserInput } from '@/lib/admin/services/user.service';
import * as registrationService from '@/lib/admin/services/registration.service';
import { SkeletonTable } from '@/components/admin/ui/skeleton';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import { SuspensionModal } from '@/components/admin/users/suspension-modal';
import type { SuspendUserInput } from '@/lib/admin/services/user.service';
import { OperationResultModal } from '@/components/admin/ui/operation-result-modal';

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [selectedRejectedRequest, setSelectedRejectedRequest] = useState<RejectedRequest | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<ActiveUser | RejectedUser | null>(null);
  const [editingUser, setEditingUser] = useState<ActiveUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ActiveUser | null>(null);
  const [feedbackStaff, setFeedbackStaff] = useState<FeedbackModalStaff | null>(null);

  // Mobile-only collapse: the search/dropdown filter row (rendered inside
  // each table's card via filterBar below) hides behind a toggle so just the
  // title + Register Onsite button in the sticky header, and the tabs, stay
  // visible on small screens — same pattern as Announcements/Remittance/Lost
  // & Found.
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(true);

  // ─── Deep-link from the notification bell ──────────────────────
  // A NEW_REGISTRATION notification links here as
  // /users?tab=pending&registrationId={userId}. Switch to the Pending tab
  // and, if a registrationId is present, fetch that one registration by id
  // (it may be far down the oldest-first queue, not on page 1) and open its
  // Review Registration Request modal directly. Runs once on mount — the
  // params are stripped from the URL right after so a refresh/back doesn't
  // reopen the modal.
  useEffect(() => {
    const tab = searchParams.get('tab');
    const registrationId = searchParams.get('registrationId');
    if (tab !== 'pending' && !registrationId) return;

    setActiveTab('pending');
    router.replace('/users?tab=pending');
    if (!registrationId) return;

    let cancelled = false;
    void registrationService
      .listPending({ id: registrationId, perPage: 1 })
      .then((result) => {
        if (cancelled) return;
        const match = result.registrations[0];
        if (match) {
          setSelectedRequest(match);
          setIsReviewModalOpen(true);
        }
      })
      .catch(() => {
        // Best-effort — the applicant may have already been approved/rejected
        // by another admin between the notification firing and this click.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately mount-only: reacting to `router`/`searchParams` would re-fire after router.replace() strips the params.
  }, []);

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

  // Rejected tab: double-clicking a row opens the details modal with the
  // row object it already has in memory — no fetch, since the current
  // page's data already carries everything the modal displays.
  const handleOpenRejectedDetails = (request: RejectedRequest) => {
    setSelectedRejectedRequest(request);
  };
  const handleCloseRejectedDetails = () => {
    setSelectedRejectedRequest(null);
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

  // Active tab label reflects the current role filter so the badge reads
  // "Active Conductors" / "Active Drivers" / "Active Admins" / "Active Commuters"
  // instead of always saying "Active Commuters" regardless of the filter.
  const activeRoleLabel =
    filters.role === 'CONDUCTOR' ? 'Conductors' :
    filters.role === 'DRIVER' ? 'Drivers' :
    filters.role === 'ADMIN' ? 'Admins' :
    filters.role === 'COMMUTER' ? 'Commuters' :
    'Users';

  // True once the active tab has data on screen (pagination is only set
  // after a successful fetch). Used to tell a first load — which needs the
  // full card skeleton — apart from a search/filter/page refetch, which
  // should keep the existing table (and its search bar) mounted and just
  // show a small in-place spinner instead of blanking the whole card.
  const hasDataForActiveTab =
    activeTab === 'active' ? pagination !== null :
    activeTab === 'pending' ? pendingPagination !== null :
    rejectedPagination !== null;

  // Search bar (left) + tab-specific filters, pushed to the right via
  // ml-auto — rendered inside each table card's header, matching the
  // Remittance/Announcements page layout. Collapses behind a mobile-only
  // toggle so the table stays reachable without scrolling past every filter;
  // the Register Onsite button lives in the sticky header instead, so it
  // stays visible even while this is collapsed.
  const filterBar = (
    <div className="flex w-full flex-col">
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out md:max-h-none!"
        style={{ maxHeight: isMobileFiltersExpanded ? '400px' : '0px' }}
      >
        <div className="flex w-full flex-col gap-3 pb-1 lg:flex-row lg:items-center">
          <SearchBar placeholder="Search users..." value={searchQuery} onChange={setSearchQuery} className="w-full sm:w-64" />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:ml-auto">
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
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setIsMobileFiltersExpanded((prev) => !prev)}
        aria-expanded={isMobileFiltersExpanded}
        aria-label={isMobileFiltersExpanded ? 'Collapse filters' : 'Expand filters'}
        className="flex w-full shrink-0 items-center justify-center border-t border-white/5 py-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 active:bg-white/10 md:hidden"
      >
        <ChevronUp className={`h-4 w-4 transition-transform duration-300 ${isMobileFiltersExpanded ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <StickyPageHeader className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
      </StickyPageHeader>

      <button
        onClick={handleOpenRegisterModal}
        className="mb-3 inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-4 text-sm font-bold text-white shadow-lg shadow-[#62A0EA]/25 transition-colors hover:bg-[#4A8BD4] sm:w-auto lg:ml-auto"
      >
        <Plus size={16} />
        <span>Register Onsite</span>
      </button>

      {/* 3 Tabs — pill bar, matching Fleet Management's tab style */}
      <div className="mb-3 flex w-full shrink-0 gap-1.5 overflow-x-auto rounded-lg border border-[#1E2D45] bg-[#0E1628] p-1 scrollbar-themed">
        {([
          { id: 'active' as const, label: `Active ${activeRoleLabel}`, count: pagination?.total ?? activeUsers.length, icon: UserCheck, accent: 'sky' as const },
          { id: 'pending' as const, label: 'Pending Verification', count: pendingTotal, icon: Users, accent: 'amber' as const },
          { id: 'rejected' as const, label: 'Rejected', count: rejectedTotal, icon: XCircle, accent: 'red' as const },
        ]).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'active') setSelectedUser(null); }}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? tab.accent === 'red'
                    ? 'bg-red-400/15 text-red-200 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.18)]'
                    : tab.accent === 'amber'
                      ? 'bg-amber-400/15 text-amber-200 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.18)]'
                      : 'bg-[#62A0EA]/15 text-white shadow-[inset_0_0_0_1px_rgba(98,160,234,0.18)]'
                  : 'text-slate-400 hover:bg-[#172238] hover:text-white'
              }`}
            >
              <tab.icon size={15} className={isActive ? (tab.accent === 'red' ? 'text-red-300' : tab.accent === 'amber' ? 'text-amber-300' : 'text-[#62A0EA]') : 'text-slate-500'} />
              <span className="truncate">{tab.label}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-black/20 text-slate-100' : 'bg-[#1A2540] text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action error banner */}
      {actionError && (
        <div className="mb-4 shrink-0 bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center justify-between">
          <p className="text-sm text-red-400">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-300">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Success banner */}
      {successMessage && (
        <div className="mb-4 shrink-0 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-400">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Tab Content — fills whatever vertical space is left, on every
          screen size, instead of a fixed height that either clips or
          leaves a gap (same approach as Remittance/Announcements). */}
      <div className="flex flex-1 min-h-0 flex-col">
        {isLoading && !hasDataForActiveTab ? (
          // First load of this tab — nothing on screen yet, so the full
          // card skeleton is the right call.
          <div className="h-full min-h-64 overflow-hidden rounded-lg">
            <SkeletonTable rows={10} columns={5} />
          </div>
        ) : error ? (
          <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-8">
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
                headerContent={filterBar}
                pagination={pagination}
                onPageChange={(page) => setFilters({ page })}
                isRefreshing={isLoading}
              />
            )}
            {activeTab === 'pending' && (
              <RegistrationRequestsTable
                requests={pendingRequests}
                onSelectRequest={handleOpenReviewModal}
                pagination={pendingPagination}
                onPageChange={setPendingPage}
                headerContent={filterBar}
                isRefreshing={isLoading}
              />
            )}
            {activeTab === 'rejected' && (
              <RejectedAccountsTable
                requests={rejectedUsers}
                onSelectRequest={handleOpenRejectedDetails}
                headerContent={filterBar}
                pagination={rejectedPagination}
                onPageChange={setRejectedPage}
                isRefreshing={isLoading}
              />
            )}
          </>
        )}
      </div>

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

      <RejectedAccountDetailsModal
        isOpen={selectedRejectedRequest !== null}
        onClose={handleCloseRejectedDetails}
        request={selectedRejectedRequest}
      />

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
    </div>
  );
}
