// lib/admin/services/lost-found.service.ts
// Admin lost-and-found service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { ADMIN_API } from "../admin/endpoints";
import { shouldUseAdminApi } from "./api-mode";
import type { AdminLostItem } from "../admin/types";

export async function fetchLostItems(): Promise<{
  items: AdminLostItem[];
  error: string | null;
}> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminLostItem[] }>(
        ADMIN_API.lostFound.list
      );
      return { items: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { items: [], error: "Unable to load lost items." };
      }
      throw error;
    }
  }

  return { items: [], error: "Lost items are unavailable until the backend is connected." };
}

export async function createLostItem(
  data: Omit<AdminLostItem, "id" | "claimsCount">
): Promise<{ item: AdminLostItem | null; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.post<{ data: AdminLostItem }>(
        ADMIN_API.lostFound.create,
        data
      );
      return { item: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { item: null, error: "Failed to create lost item." };
      }
      throw error;
    }
  }

  return { item: null, error: "Unavailable until the backend is connected." };
}
