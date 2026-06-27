// frontend/app/(admin)/users/data/users-data.ts
//
// S5-T10 — Admin User Management data hook.
//
// ACTIVE USERS: fetched from the real Laravel API via the Next.js proxy
//   (GET /api/admin/users → /api/v1/admin/users) with role filter, search,
//   and pagination. No mock data.
//
// PENDING / REJECTED tabs: still backed by mock data. S5-T17 will wire
//   these to the /admin/registrations/* endpoints (the backend already
//   exists from S5-T8). The mock is kept here so the page remains
//   functional in the interim — T17 will remove it.
//
// The ActiveUser type was changed from `id: number` to `id: string`
// because the backend uses UUID primary keys.

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

// ─── Re-exported types (used by components) ─────────────────────────

export type { AdminUser, PaginationMeta, UserListFilters, UpdateUserInput };

/**
 * A user row in the Active tab.
 *
 * Wraps the service-layer `AdminUser` with the legacy field names the
 * existing table/modal components expect (`phoneNumber`, `status`,
 * `commuterType`, `languagePreference`, `idImageUrl`). This adapter
 * type lets us wire real API data without rewriting every component.
 */
export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: "Active" | "Suspended";
  commuterType: string;
  languagePreference: string;
  idImageUrl: string;
  /** The raw service-layer user (for API calls). */
  _raw: AdminUser;
}

// ─── Pending / Rejected (mock — T17 will replace) ───────────────────

export interface PendingRequest {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  commuterType: "Regular" | "Student" | "Senior Citizen" | "PWD";
  languagePreference: "English" | "Filipino";
  idImageUrl: string;
  status: "Pending Verification";
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

// ─── Pending / Rejected mock (T17 will remove + wire to API) ────────

const MOCK_PENDING_REQUESTS: PendingRequest[] = [
  { id: "REQ-101", name: "Marinel Carbonel", email: "Mari.C@email.com", phoneNumber: "0919-345-6789", commuterType: "PWD", languagePreference: "English", idImageUrl: "https://placehold.co/150x150/0A1E33/FFFFFF?text=PWD+ID", status: "Pending Verification" },
  { id: "REQ-102", name: "Stephen Hawkin", email: "Jeff.Stephen@email.com", phoneNumber: "0920-456-7890", commuterType: "PWD", languagePreference: "Filipino", idImageUrl: "https://placehold.co/150x150/0A1E33/FFFFFF?text=Senior+ID", status: "Pending Verification" },
];

const MOCK_REJECTED_USERS: RejectedUser[] = [
  { id: "REQ-099", name: "Fake Account", email: "fake@email.com", phoneNumber: "0000-000-0000", commuterType: "Regular", languagePreference: "English", idImageUrl: "https://placehold.co/150x150/0A1E33/FFFFFF?text=Fake+ID", status: "Rejected", rejectionReason: "Invalid ID provided." },
];

const MOCK_HISTORY_LOGS: Record<string, HistoryLog[]> = {
  // History logs are deferred — the backend trip-payment history endpoint
  // is not part of S5-T10 scope. T17 or a later task will wire this.
};

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
  /** Update a user via the API and refresh the list. */
  updateUserApi: (id: string, data: UpdateUserInput) => Promise<void>;
  /** Delete a user via the API and refresh the list. */
  deleteUserApi: (id: string) => Promise<void>;
}

function mapToActiveUser(u: AdminUser): ActiveUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phoneNumber: u.contactNumber ?? "—",
    status: u.statusLabel === "Suspended" ? "Suspended" : "Active",
    commuterType: u.commuterTypeLabel,
    languagePreference: "English", // not returned by the admin user endpoint
    idImageUrl: "", // the admin user list endpoint doesn't return id_image_url
    _raw: u,
  };
}

export function useUsersData(): UseUsersDataReturn {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
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
      setActiveUsers(result.users.map(mapToActiveUser));
      setPagination(result.pagination);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load users.";
      setError(msg);
      setActiveUsers([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchUsers(filters);
  }, [fetchUsers, filters]);

  // Re-fetch whenever filters change.
  useEffect(() => {
    fetchUsers(filters);
  }, [fetchUsers, filters]);

  const setFilters = useCallback((f: Partial<UserListFilters>) => {
    setFiltersState((prev) => {
      // Changing role or search resets to page 1.
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
      // Refresh the current page to show the updated row.
      await fetchUsers(filters);
    },
    [fetchUsers, filters]
  );

  const deleteUserApi = useCallback(
    async (id: string) => {
      await deleteUser(id);
      // If we just deleted the last row on page 2+, go back a page.
      if (
        pagination &&
        pagination.currentPage > 1 &&
        activeUsers.length === 1
      ) {
        setFiltersState((prev) => ({ ...prev, page: prev.page! - 1 }));
      } else {
        await fetchUsers(filters);
      }
    },
    [fetchUsers, filters, pagination, activeUsers.length]
  );

  return {
    activeUsers,
    pendingRequests: MOCK_PENDING_REQUESTS,
    rejectedUsers: MOCK_REJECTED_USERS,
    historyLogs: MOCK_HISTORY_LOGS,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    refetch,
    updateUserApi,
    deleteUserApi,
  };
}

// ─── Error type re-export (for try/catch in the page) ──────────────

export type { UserOperationError };
