import { api, ApiError, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import { shouldUseConductorApi } from "@/lib/conductor/services/api-mode";
import * as remittanceStore from "@/lib/conductor/persistence/remittance.store";

export type { RemittanceRecord } from "@/lib/conductor/persistence/remittance.store";

export async function fetchRemittanceHistory() {
  if (shouldUseConductorApi()) {
    try {
      const response = await api.get<{ data: remittanceStore.RemittanceRecord[] }>(
        CONDUCTOR_API.remittances.list
      );
      return response.data ?? [];
    } catch (error) {
      if (!(error instanceof NetworkError) && !(error instanceof ApiError)) throw error;
    }
  }

  return remittanceStore.getRemittanceHistory();
}

export async function submitRemittance(record: remittanceStore.RemittanceRecord) {
  if (shouldUseConductorApi()) {
    try {
      const response = await api.post<{ data: remittanceStore.RemittanceRecord[] }>(
        CONDUCTOR_API.remittances.create,
        record
      );
      return response.data ?? [record];
    } catch (error) {
      if (!(error instanceof NetworkError) && !(error instanceof ApiError)) throw error;
    }
  }

  return remittanceStore.saveRemittance(record);
}

export function getRemittanceHistory() {
  return remittanceStore.getRemittanceHistory();
}

export function saveRemittance(record: remittanceStore.RemittanceRecord) {
  return remittanceStore.saveRemittance(record);
}

export function getUnitRemittanceHistory(unitNumber: string) {
  return remittanceStore
    .getRemittanceHistory()
    .filter((record) => record.unitNumber === unitNumber);
}
