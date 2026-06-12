// lib/commuter/services/payment.service.ts
// Commuter payment history service — API-first with localStorage fallback.

import { api, ApiError, NetworkError } from "@/lib/api/client";
import { COMMUTER_API } from "../commuter/endpoints";
import { shouldUseCommuterApi } from "./api-mode";
import type { CommuterPaymentRecord } from "../commuter/types";

const STORAGE_KEY = "chatco_payment_history";

export async function fetchPaymentHistory(): Promise<{
  records: CommuterPaymentRecord[];
  error: string | null;
}> {
  if (shouldUseCommuterApi()) {
    try {
      const response = await api.get<{ data: CommuterPaymentRecord[] }>(
        COMMUTER_API.payments.history
      );
      return { records: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return {
          records: [],
          error: "Unable to load payment history. Please check your connection.",
        };
      }
      throw error;
    }
  }

  // Fallback: localStorage (prototype phase)
  return { records: getLocalPaymentHistory(), error: null };
}

export async function createPayment(
  payment: Omit<CommuterPaymentRecord, "id" | "createdAt">
): Promise<{ record: CommuterPaymentRecord | null; error: string | null }> {
  if (shouldUseCommuterApi()) {
    try {
      const response = await api.post<{ data: CommuterPaymentRecord }>(
        COMMUTER_API.payments.create,
        payment
      );
      return { record: response.data ?? null, error: null };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ApiError) {
        return {
          record: null,
          error: "Unable to process payment. Please try again.",
        };
      }
      throw error;
    }
  }

  // Fallback: save to localStorage
  const record: CommuterPaymentRecord = {
    ...payment,
    id: `pay_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveLocalPayment(record);
  return { record, error: null };
}

// ─── localStorage helpers (prototype phase only) ───

function getLocalPaymentHistory(): CommuterPaymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPayment(record: CommuterPaymentRecord): void {
  if (typeof window === "undefined") return;
  const history = getLocalPaymentHistory();
  history.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
