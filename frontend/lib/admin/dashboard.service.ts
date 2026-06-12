// lib/admin/services/dashboard.service.ts
// Admin dashboard service — API-first with mock fallback.
// Same pattern as conductor shift.service.ts.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { ADMIN_API } from "../admin/endpoints";
import { shouldUseAdminApi } from "./api-mode";
import type { AdminDashboardData } from "../admin/types";

export async function fetchDashboardData(): Promise<{
  data: AdminDashboardData | null;
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminDashboardData }>(
        ADMIN_API.dashboard
      );
      return { data: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return {
          data: null,
          error: "Unable to load dashboard data. Please try again.",
        };
      }
      throw error;
    }
  }

  return {
    data: null,
    error: "Dashboard data is unavailable until the backend is connected.",
  };
}
