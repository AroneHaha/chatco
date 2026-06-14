import { api, ApiError, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import { shouldUseConductorApi } from "@/lib/conductor/services/api-mode";
import * as transactionsStore from "@/lib/conductor/persistence/transactions.store";

export type { Transaction } from "@/lib/conductor/persistence/transactions.store";
export type { PaymentMethodType } from "@/types";

export async function fetchShiftTransactions(shiftId: string) {
  if (shouldUseConductorApi()) {
    try {
      const response = await api.get<{ data: transactionsStore.Transaction[] }>(
        CONDUCTOR_API.transactions.list(shiftId)
      );
      return response.data ?? [];
    } catch (error) {
      if (!(error instanceof NetworkError) && !(error instanceof ApiError)) throw error;
    }
  }

  return transactionsStore.getShiftTransactions(shiftId);
}

export async function createTransaction(
  shiftId: string,
  txn: Omit<transactionsStore.Transaction, "transactionId" | "timestamp">
) {
  if (shouldUseConductorApi()) {
    try {
      const response = await api.post<{ data: transactionsStore.Transaction }>(
        CONDUCTOR_API.transactions.create,
        { shiftId, ...txn }
      );
      transactionsStore.cacheTransaction(shiftId, response.data);
      return response.data;
    } catch (error) {
      if (!(error instanceof NetworkError) && !(error instanceof ApiError)) throw error;
    }
  }

  return transactionsStore.saveTransaction(shiftId, txn);
}

export function getShiftTransactions(shiftId: string) {
  return transactionsStore.getShiftTransactions(shiftId);
}

export function saveTransaction(
  shiftId: string,
  txn: Omit<transactionsStore.Transaction, "transactionId" | "timestamp">
) {
  return createTransaction(shiftId, txn);
}

export function clearShiftTransactions(shiftId: string) {
  transactionsStore.clearShiftTransactions(shiftId);
}
