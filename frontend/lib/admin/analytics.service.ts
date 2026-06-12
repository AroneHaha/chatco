// lib/admin/services/analytics.service.ts
// Admin analytics service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { ADMIN_API } from "../admin/endpoints";
import { shouldUseAdminApi } from "./api-mode";
import type { AdminRemittanceRecord, AdminPaymentUsage } from "../admin/types";

export async function fetchRemittanceAnalytics(): Promise<{
  records: AdminRemittanceRecord[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminRemittanceRecord[] }>(
        ADMIN_API.analytics.remittances
      );
      return { records: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { records: [], error: "Unable to load analytics." };
      }
      throw error;
    }
  }

  return { records: [], error: "Analytics are unavailable until the backend is connected." };
}

export async function fetchPaymentUsage(): Promise<{
  usage: AdminPaymentUsage[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminPaymentUsage[] }>(
        ADMIN_API.analytics.paymentUsage
      );
      return { usage: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { usage: [], error: "Unable to load payment usage." };
      }
      throw error;
    }
  }

  return { usage: [], error: "Payment usage is unavailable until the backend is connected." };
}
