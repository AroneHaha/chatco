import { api, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import * as transactionsStore from "@/lib/conductor/persistence/transactions.store";

export type { Transaction } from "@/lib/conductor/persistence/transactions.store";
export type { PaymentMethodType } from "@/types";

function hasRemoteApi(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL);
}

export async function fetchShiftTransactions(shiftId: string) {
  if (hasRemoteApi()) {
    try {
      const response = await api.get<{ data: transactionsStore.Transaction[] }>(
        CONDUCTOR_API.transactions.list(shiftId)
      );
      return response.data ?? [];
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error;
    }
  }

  return transactionsStore.getShiftTransactions(shiftId);
}

export async function createTransaction(
  shiftId: string,
  txn: Omit<transactionsStore.Transaction, "transactionId" | "timestamp">
) {
  if (hasRemoteApi()) {
    try {
      const response = await api.post<{ data: transactionsStore.Transaction }>(
        CONDUCTOR_API.transactions.create,
        { shiftId, ...txn }
      );
      return response.data;
    } catch (error) {
      if (!(error instanceof NetworkError)) throw error;
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
  return transactionsStore.saveTransaction(shiftId, txn);
}

export function clearShiftTransactions(shiftId: string) {
  transactionsStore.clearShiftTransactions(shiftId);
}
