// lib/admin/services/users.service.ts
// Admin user management service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { ADMIN_API } from "../admin/endpoints";
import { shouldUseAdminApi } from "./api-mode";
import type { AdminActiveUser, AdminPendingRequest, AdminRejectedUser } from "../admin/types";

export async function fetchActiveUsers(): Promise<{
  users: AdminActiveUser[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminActiveUser[] }>(
        ADMIN_API.users.active
      );
      return { users: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { users: [], error: "Unable to load active users." };
      }
      throw error;
    }
  }

  return { users: [], error: "Users are unavailable until the backend is connected." };
}

export async function fetchPendingRequests(): Promise<{
  requests: AdminPendingRequest[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminPendingRequest[] }>(
        ADMIN_API.users.pending
      );
      return { requests: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { requests: [], error: "Unable to load pending requests." };
      }
      throw error;
    }
  }

  return { requests: [], error: "Requests are unavailable until the backend is connected." };
}

export async function approveUser(id: string): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      await api.post(ADMIN_API.users.approve(id));
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to approve user." };
      }
      throw error;
    }
  }

  return { success: false, error: "Unavailable until the backend is connected." };
}

export async function rejectUser(id: string, reason: string): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      await api.post(ADMIN_API.users.reject(id), { reason });
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to reject user." };
      }
      throw error;
    }
  }

  return { success: false, error: "Unavailable until the backend is connected." };
}
