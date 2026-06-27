// frontend/app/(admin)/users/data/users-data.ts
//
// Admin User Management data hook.
//
// ACTIVE USERS: fetched from GET /api/admin/users (real API)
// PENDING: fetched from GET /api/admin/registrations (real API)
// REJECTED: empty (rejected accounts are soft-deleted — not listed)
//
// No mock data anywhere.

import { useState, useEffect, useCallback } from "react";
import {
  list as listUsers,
  update as updateUser,
  remove as deleteUser,
  type AdminUser,
  type UserListFilters,
  type PaginationMeta,
  type UpdateUserInput,
  type UserOperationError,
} from "@/lib/admin/services/user.service";
import * as registrationService from "@/lib/admin/services/registration.service";

// ─── Re-exported types ───────────────────────────────────────────────

export type { AdminUser, PaginationMeta, UserListFilters, UpdateUserInput };
export type PendingRequest = registrationService.PendingRegistration;

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: "Active" | "Suspended";
  commuterType: string;
  languagePreference: string;
  idImageUrl: string;
  _raw: AdminUser;
}

export interface RejectedUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  commuterType: "Regular" | "Student" | "Senior Citizen" | "PWD";
  languagePreference: "English" | "Filipino";
  idImageUrl: string;
  status: "Rejected";
  rejectionReason: string;
}

export interface HistoryLog {
  id: string;
  date: string;
  action: string;
  details: string;
}

// ─── Hook ───────────────────────────────────────────────────────────

export interface UseUsersDataReturn {
  activeUsers: ActiveUser[];
  pendingRequests: PendingRequest[];
  rejectedUsers: RejectedUser[];
  historyLogs: Record<string, HistoryLog[]>;
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  filters: UserListFilters;
  setFilters: (f: Partial<UserListFilters>) => void;
  refetch: () => void;
  updateUserApi: (id: string, data: UpdateUserInput) => Promise<void>;
  deleteUserApi: (id: string) => Promise<void>;
  approveRegistrationApi: (id: string) => Promise<string>;
  rejectRegistrationApi: (id: string, reason: string) => Promise<string>;
}

function mapToActiveUser(u: AdminUser): ActiveUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phoneNumber: u.contactNumber ?? "—",
    status: u.statusLabel === "Suspended" ? "Suspended" : "Active",
    commuterType: u.commuterTypeLabel,
    languagePreference: "English",
    idImageUrl: "",
    _raw: u,
  };
}

export function useUsersData(): UseUsersDataReturn {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<RejectedUser[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<UserListFilters>({
    role: "COMMUTER",
    search: "",
    perPage: 10,
    page: 1,
  });

  const fetchUsers = useCallback(async (f: UserListFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listUsers(f);
      // Filter out PENDING and REJECTED from the Active tab.
      const activeOnly = result.users.filter(
        (u) => u.accountStatus !== "PENDING" && u.accountStatus !== "REJECTED"
      );
      setActiveUsers(activeOnly.map(mapToActiveUser));
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
      setActiveUsers([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPending = useCallback(async () => {
    try {
      const pending = await registrationService.listPending();
      setPendingRequests(pending);
    } catch {
      setPendingRequests([]);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchUsers(filters);
    fetchPending();
  }, [fetchUsers, fetchPending, filters]);

  useEffect(() => {
    fetchUsers(filters);
    fetchPending();
  }, [fetchUsers, fetchPending, filters]);

  const setFilters = useCallback((f: Partial<UserListFilters>) => {
    setFiltersState((prev) => {
      const roleChanged = f.role !== undefined && f.role !== prev.role;
      const searchChanged = f.search !== undefined && f.search !== prev.search;
      const next = { ...prev, ...f };
      if (roleChanged || searchChanged) next.page = 1;
      return next;
    });
  }, []);

  const updateUserApi = useCallback(
    async (id: string, data: UpdateUserInput) => {
      await updateUser(id, data);
      await fetchUsers(filters);
    },
    [fetchUsers, filters]
  );

  const deleteUserApi = useCallback(
    async (id: string) => {
      await deleteUser(id);
      if (pagination && pagination.currentPage > 1 && activeUsers.length === 1) {
        setFiltersState((prev) => ({ ...prev, page: prev.page! - 1 }));
      } else {
        await fetchUsers(filters);
      }
    },
    [fetchUsers, filters, pagination, activeUsers.length]
  );

  // ── Registration review (returns a success message for the UI) ──

  const approveRegistrationApi = useCallback(
    async (id: string): Promise<string> => {
      const result = await registrationService.approve(id);
      // Refresh both lists: pending loses the row, active gains the commuter.
      await fetchPending();
      await fetchUsers(filters);
      return `Approved ${result.name} — commuter type: ${result.commuter_type}. They can now log in.`;
    },
    [fetchPending, fetchUsers, filters]
  );

  const rejectRegistrationApi = useCallback(
    async (id: string, reason: string): Promise<string> => {
      await registrationService.reject(id, reason);
      // Refresh the pending list (the rejected row is soft-deleted).
      await fetchPending();
      return `Registration rejected. Reason: "${reason}". The email is now available for re-registration.`;
    },
    [fetchPending]
  );

  return {
    activeUsers,
    pendingRequests,
    rejectedUsers,
    historyLogs: {},
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    refetch,
    updateUserApi,
    deleteUserApi,
    approveRegistrationApi,
    rejectRegistrationApi,
  };
}

export type { UserOperationError };
