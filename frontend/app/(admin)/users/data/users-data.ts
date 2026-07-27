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
export type RejectedRequest = registrationService.RejectedRegistration;

/**
 * Frontend-only role union. Adds "DRIVER" on top of the backend UserRole
 * (ADMIN | CONDUCTOR | COMMUTER) so the User Management table can show
 * drivers in the same view. Drivers live in a separate `drivers` table
 * (not users) — when the role filter is "DRIVER", the hook fetches from
 * /api/admin/drivers instead of /api/admin/users.
 */
export type TableRowRole = "ADMIN" | "CONDUCTOR" | "COMMUTER" | "DRIVER";

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: "Active" | "Suspended";
  commuterType: string;
  languagePreference: string;
  idImageUrl: string;
  /** Frontend-only role label — includes "DRIVER" for driver rows. */
  role: TableRowRole;
  /**
   * Optional raw backend user. Absent for DRIVER rows (drivers aren't
   * users — they come from /api/admin/drivers, not /api/admin/users).
   */
  _raw?: AdminUser;
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

/**
 * Local filter shape. Extends the backend UserListFilters with the
 * frontend-only "DRIVER" role value (drivers live in a separate table).
 */
export interface UsersTabFilters {
  role: TableRowRole | "";
  search: string;
  perPage: number;
  page: number;
  sort: "recent" | "oldest" | "alphabetical";
  accountStatus: "" | "ACTIVE" | "SUSPENDED";
}

export interface UseUsersDataReturn {
  activeUsers: ActiveUser[];
  pendingRequests: PendingRequest[];
  rejectedUsers: RejectedUser[];
  historyLogs: Record<string, HistoryLog[]>;
  /** Fetches a user's activity timeline. Cached in historyLogs. */
  fetchUserActivity: (userId: string) => Promise<HistoryLog[]>;
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  filters: UsersTabFilters;
  setFilters: (f: Partial<UsersTabFilters>) => void;
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
    role: u.role,
    _raw: u,
  };
}

/**
 * Raw driver shape from GET /api/admin/drivers (Laravel Driver model).
 * Drivers are NOT users — they have their own table with license/contact
 * fields. We map them into ActiveUser so the same table component can
 * render them alongside conductors/commuters/admins.
 */
interface RawDriver {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  contact: string | null;
  license_number: string | null;
  status: string | null;
}

function mapDriverToActiveUser(d: RawDriver): ActiveUser {
  const fullName = [d.first_name, d.middle_name, d.last_name]
    .filter(Boolean)
    .join(" ");
  return {
    id: d.id,
    name: fullName || "Unknown Driver",
    email: "—",
    phoneNumber: d.contact ?? "—",
    status: d.status === "ACTIVE" ? "Active" : "Suspended",
    // Drivers don't have a commuter type — show license number instead so
    // the table column is still useful for driver rows.
    commuterType: d.license_number ?? "—",
    languagePreference: "English",
    idImageUrl: "",
    role: "DRIVER",
  };
}

export function useUsersData(): UseUsersDataReturn {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<RejectedUser[]>([]);
  const [historyLogs, setHistoryLogs] = useState<Record<string, HistoryLog[]>>({});
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Local filter type extends the backend UserListFilters with the
  // frontend-only "DRIVER" value. When role === "DRIVER" the hook fetches
  // from /api/admin/drivers instead of /api/admin/users (drivers aren't
  // users — they're a separate table).
  const [filters, setFiltersState] = useState<UsersTabFilters>({
    role: "COMMUTER",
    search: "",
    perPage: 10,
    page: 1,
    sort: "recent",
    accountStatus: "",
  });

  /**
   * Fetch the active list. When filters.role === "DRIVER", hit the drivers
   * endpoint and map results to ActiveUser. Otherwise hit the users endpoint
   * as before. Driver list is NOT paginated at the backend (returns all
   * drivers), so we synthesize pagination metadata client-side.
   */
  const fetchUsers = useCallback(
    async (f: UsersTabFilters) => {
      setIsLoading(true);
      setError(null);
      try {
        if (f.role === "DRIVER") {
          const res = await fetch("/api/admin/drivers", {
            headers: { Accept: "application/json" },
            credentials: "include",
          });
          if (!res.ok) {
            const msg = await res.json().catch(() => null);
            throw new Error(msg?.message ?? `Failed to load drivers (${res.status}).`);
          }
          const json = await res.json();
          const drivers: RawDriver[] = Array.isArray(json.data) ? json.data : [];
          const query = f.search.trim().toLowerCase();
          let mapped = drivers
            .map(mapDriverToActiveUser)
            .filter(user =>
              (!query || [user.name, user.phoneNumber, user.commuterType].some(value => value.toLowerCase().includes(query))) &&
              (!f.accountStatus || (f.accountStatus === "ACTIVE" ? user.status === "Active" : user.status === "Suspended"))
            );
          mapped = [...mapped].sort((a, b) => {
            if (f.sort === "alphabetical") return a.name.localeCompare(b.name);
            return f.sort === "oldest" ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
          });
          // Client-side pagination — backend returns all drivers at once.
          const perPage = f.perPage || 10;
          const page = f.page || 1;
          const total = mapped.length;
          const lastPage = Math.max(1, Math.ceil(total / perPage));
          const from = total === 0 ? null : (page - 1) * perPage + 1;
          const to = total === 0 ? null : Math.min(page * perPage, total);
          const slice = mapped.slice((page - 1) * perPage, page * perPage);
          setActiveUsers(slice);
          setPagination({
            currentPage: page,
            perPage,
            total,
            lastPage,
            from,
            to,
          });
          return;
        }

        // Normal user fetch — pass role through to the backend (DRIVER
        // never reaches here).
        const result = await listUsers({
          role: f.role === "" ? "" : (f.role as Exclude<UserListFilters["role"], undefined>),
          search: f.search,
          perPage: f.perPage,
          page: f.page,
          sort: f.sort,
          accountStatus: f.accountStatus,
        });
        setActiveUsers(result.users.map(mapToActiveUser));
        setPagination(result.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users.");
        setActiveUsers([]);
        setPagination(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchPending = useCallback(async () => {
    try {
      const pending = await registrationService.listPending();
      setPendingRequests(pending);
    } catch {
      setPendingRequests([]);
    }
  }, []);

  // ── Fetch rejected registrations (soft-deleted REJECTED commuters) ──
  // Rejected accounts are soft-deleted with their email rewritten to
  // 'rejected+{timestamp}@chatco.local'. The backend's listRejectedRegistrations
  // uses withTrashed() to include them. Powers the Rejected tab.
  const fetchRejected = useCallback(async () => {
    try {
      const rejected = await registrationService.listRejected();
      setRejectedUsers(rejected.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phoneNumber: r.phoneNumber,
        commuterType: r.commuterType as RejectedUser["commuterType"],
        languagePreference: r.languagePreference as RejectedUser["languagePreference"],
        idImageUrl: r.idImageUrl,
        status: "Rejected" as const,
        rejectionReason: r.rejectionReason,
      })));
    } catch {
      setRejectedUsers([]);
    }
  }, []);

  // ── Fetch a user's activity timeline ──
  // Calls GET /api/admin/users/{id}/activity which reuses existing data
  // (transactions, shift_logs, verification dates) to build a chronological
  // timeline. Cached in historyLogs so repeat opens don't re-fetch.
  const fetchUserActivity = useCallback(async (userId: string): Promise<HistoryLog[]> => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = await res.json();
      const events = (json.data ?? []) as Array<{
        id: string;
        timestamp: string;
        action: string;
        details: string;
      }>;
      const logs: HistoryLog[] = events.map(e => ({
        id: e.id,
        date: e.timestamp ? new Date(e.timestamp).toLocaleString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true,
        }) : '—',
        action: e.action,
        details: e.details,
      }));
      setHistoryLogs(prev => ({ ...prev, [userId]: logs }));
      return logs;
    } catch {
      return [];
    }
  }, []);

  const refetch = useCallback(() => {
    fetchUsers(filters);
    fetchPending();
    fetchRejected();
  }, [fetchUsers, fetchPending, fetchRejected, filters]);

  useEffect(() => {
    fetchUsers(filters);
    fetchPending();
    fetchRejected();
  }, [fetchUsers, fetchPending, fetchRejected, filters]);

  const setFilters = useCallback(
    (f: Partial<UsersTabFilters>) => {
      setFiltersState((prev) => {
        const roleChanged = f.role !== undefined && f.role !== prev.role;
        const searchChanged = f.search !== undefined && f.search !== prev.search;
        const sortChanged = f.sort !== undefined && f.sort !== prev.sort;
        const statusChanged = f.accountStatus !== undefined && f.accountStatus !== prev.accountStatus;
        const pageSizeChanged = f.perPage !== undefined && f.perPage !== prev.perPage;
        const next = { ...prev, ...f };
        if (roleChanged || searchChanged || sortChanged || statusChanged || pageSizeChanged) next.page = 1;
        return next;
      });
    },
    []
  );

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
    historyLogs,
    fetchUserActivity,
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
