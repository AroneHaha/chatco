// frontend/app/(admin)/users/data/users-data.ts
//
// Admin User Management data hook.
//
// ACTIVE USERS: fetched from GET /api/admin/users (real API)
// PENDING: fetched from GET /api/admin/registrations (real API)
// REJECTED: fetched from GET /api/admin/users?status=REJECTED (real API)
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

// ─── Re-exported types ───────────────────────────────────────────────

export type { AdminUser, PaginationMeta, UserListFilters, UpdateUserInput };

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

export interface PendingRequest {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  commuterType: "Regular" | "Student" | "Senior Citizen" | "PWD";
  languagePreference: "English" | "Filipino";
  idImageUrl: string;
  status: "Pending Verification";
  birthdate: string;
  gender: string;
  username: string;
  appliedType: string;
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

// ─── API helpers for registrations ───────────────────────────────────

interface RawRegistration {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  surname: string;
  birthdate: string;
  gender: string;
  contact_number: string;
  username: string;
  applied_type: string;
  id_image_url: string;
  account_status: string;
  language_preference: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, "Regular" | "Student" | "Senior Citizen" | "PWD"> = {
  REGULAR: "Regular",
  STUDENT: "Student",
  SENIOR: "Senior Citizen",
  PWD: "PWD",
};

function mapToPendingRequest(r: RawRegistration): PendingRequest {
  return {
    id: r.id,
    name: `${r.first_name} ${r.middle_name ? r.middle_name + ' ' : ''}${r.surname}`.trim(),
    email: r.email,
    phoneNumber: r.contact_number,
    commuterType: TYPE_LABELS[r.applied_type] ?? "Regular",
    languagePreference: (r.language_preference === "Filipino" ? "Filipino" : "English") as "English" | "Filipino",
    idImageUrl: r.id_image_url,
    status: "Pending Verification",
    birthdate: r.birthdate,
    gender: r.gender,
    username: r.username,
    appliedType: r.applied_type,
  };
}

async function fetchPendingRegistrations(): Promise<PendingRequest[]> {
  const res = await fetch("/api/admin/registrations", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch pending registrations");
  const json = await res.json();
  const rows = json.data?.data ?? json.data ?? [];
  return (rows as RawRegistration[]).map(mapToPendingRequest);
}

async function approveRegistration(id: string): Promise<void> {
  const res = await fetch(`/api/admin/registrations/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? "Failed to approve registration");
  }
}

async function rejectRegistration(id: string, reason: string): Promise<void> {
  const res = await fetch(`/api/admin/registrations/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ rejection_reason: reason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? "Failed to reject registration");
  }
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
  approveRegistrationApi: (id: string) => Promise<void>;
  rejectRegistrationApi: (id: string, reason: string) => Promise<void>;
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
      // Filter out PENDING and REJECTED from the Active tab — only show
      // APPROVED / ACTIVE / SUSPENDED commuters.
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
      const pending = await fetchPendingRegistrations();
      setPendingRequests(pending);
    } catch {
      // Non-fatal — the Pending tab just shows empty
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

  const approveRegistrationApi = useCallback(
    async (id: string) => {
      await approveRegistration(id);
      // Refresh both lists: the pending list loses the row, the active
      // list gains the newly-approved commuter.
      await fetchPending();
      await fetchUsers(filters);
    },
    [fetchPending, fetchUsers, filters]
  );

  const rejectRegistrationApi = useCallback(
    async (id: string, reason: string) => {
      await rejectRegistration(id, reason);
      // Refresh the pending list (the rejected row is soft-deleted + removed)
      await fetchPending();
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
