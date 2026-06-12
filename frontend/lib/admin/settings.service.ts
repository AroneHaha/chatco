// lib/admin/services/settings.service.ts
// Admin settings service — API-first with mock fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { ADMIN_API } from "../admin/endpoints";
import { shouldUseAdminApi } from "./api-mode";
import type {
  AdminFareConfig,
  AdminFinancialRules,
  AdminSafetyConfig,
  AdminAppConfig,
  AdminFAQ,
  AdminVoucher,
  AdminNotificationTemplate,
  AdminRoute,
} from "../admin/types";

// ─── Fare Matrix ───

export async function fetchFareConfig(): Promise<{ config: AdminFareConfig | null; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminFareConfig }>(ADMIN_API.settings.fareMatrix);
      return { config: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { config: null, error: "Unable to load fare config." };
      }
      throw error;
    }
  }
  return { config: null, error: "Unavailable until the backend is connected." };
}

export async function updateFareConfig(config: Partial<AdminFareConfig>): Promise<{ success: boolean; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      await api.put(ADMIN_API.settings.fareMatrix, config);
      return { success: true, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { success: false, error: "Failed to update fare config." };
      }
      throw error;
    }
  }
  return { success: false, error: "Unavailable until the backend is connected." };
}

// ─── Financial Rules ───

export async function fetchFinancialRules(): Promise<{ rules: AdminFinancialRules | null; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminFinancialRules }>(ADMIN_API.settings.financialRules);
      return { rules: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { rules: null, error: "Unable to load financial rules." };
      }
      throw error;
    }
  }
  return { rules: null, error: "Unavailable until the backend is connected." };
}

// ─── Safety Config ───

export async function fetchSafetyConfig(): Promise<{ config: AdminSafetyConfig | null; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminSafetyConfig }>(ADMIN_API.settings.safety);
      return { config: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { config: null, error: "Unable to load safety config." };
      }
      throw error;
    }
  }
  return { config: null, error: "Unavailable until the backend is connected." };
}

// ─── App Config ───

export async function fetchAppConfig(): Promise<{ config: AdminAppConfig | null; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminAppConfig }>(ADMIN_API.settings.appConfig);
      return { config: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { config: null, error: "Unable to load app config." };
      }
      throw error;
    }
  }
  return { config: null, error: "Unavailable until the backend is connected." };
}

// ─── Vouchers ───

export async function fetchVouchers(): Promise<{ vouchers: AdminVoucher[]; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminVoucher[] }>(ADMIN_API.settings.vouchers);
      return { vouchers: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { vouchers: [], error: "Unable to load vouchers." };
      }
      throw error;
    }
  }
  return { vouchers: [], error: "Unavailable until the backend is connected." };
}

// ─── FAQ ───

export async function fetchFAQs(): Promise<{ faqs: AdminFAQ[]; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminFAQ[] }>(ADMIN_API.settings.faq);
      return { faqs: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { faqs: [], error: "Unable to load FAQs." };
      }
      throw error;
    }
  }
  return { faqs: [], error: "Unavailable until the backend is connected." };
}

// ─── Routes ───

export async function fetchRoutes(): Promise<{ routes: AdminRoute[]; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminRoute[] }>(ADMIN_API.settings.routes);
      return { routes: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { routes: [], error: "Unable to load routes." };
      }
      throw error;
    }
  }
  return { routes: [], error: "Unavailable until the backend is connected." };
}

// ─── Notification Templates ───

export async function fetchNotificationTemplates(): Promise<{ templates: AdminNotificationTemplate[]; error: string | null }> {
  if (shouldUseAdminApi()) {
    try {
      const response = await api.get<{ data: AdminNotificationTemplate[] }>(ADMIN_API.settings.notificationTemplates);
      return { templates: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return { templates: [], error: "Unable to load notification templates." };
      }
      throw error;
    }
  }
  return { templates: [], error: "Unavailable until the backend is connected." };
}
