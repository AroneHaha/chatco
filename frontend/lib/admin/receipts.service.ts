// lib/admin/services/receipts.service.ts
// Admin receipts service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { ADMIN_API } from "../admin/endpoints";
import { shouldUseAdminApi } from "./api-mode";
import type { AdminReceipt } from "../admin/types";

export async function fetchReceipts(): Promise<{
  receipts: AdminReceipt[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminReceipt[] }>(
        ADMIN_API.receipts.list
      );
      return { receipts: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { receipts: [], error: "Unable to load receipts." };
      }
      throw error;
    }
  }

  return { receipts: [], error: "Receipts are unavailable until the backend is connected." };
}
