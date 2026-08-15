import { api, NetworkError } from "@/lib/api/client";
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
      if (!(error instanceof NetworkError)) throw error;
    }
  }

  return remittanceStore.getRemittanceHistory();
}

/**
 * Submit the end-of-day remittance. This is the ONLY thing that ends a shift
 * (Laravel's endShiftViaRemittance writes the remittance row, flips the
 * shift_log to ENDED and frees the vehicle + driver).
 *
 * Errors PROPAGATE — deliberately. This previously caught NetworkError and
 * ApiError and fell through to `remittanceStore.saveRemittance()`, which
 * writes localStorage and returns normally. A failed remit therefore looked
 * identical to a successful one: the end-of-day page went on to clear the
 * shift, show the "Remitted!" overlay and redirect to login, while the server
 * still had the shift ACTIVE with all its transactions. The next login then
 * resolved that same still-active shift and its cash/GCash totals reappeared,
 * which is exactly the "already remitted but the values came back" bug.
 *
 * There is no safe offline story for this call: remittance is a financial
 * hand-off and a shift-ending state change that only the server can make. If
 * it fails the conductor must know and retry, so the caller can surface the
 * error instead of being told a lie.
 */
export async function submitRemittance(record: remittanceStore.RemittanceRecord) {
  if (shouldUseConductorApi()) {
    const response = await api.post<{ data: remittanceStore.RemittanceRecord[] }>(
      CONDUCTOR_API.remittances.create,
      record
    );
    return response.data ?? [record];
  }

  // Explicit local prototype mode only (NEXT_PUBLIC_CONDUCTOR_API_MODE=local).
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
