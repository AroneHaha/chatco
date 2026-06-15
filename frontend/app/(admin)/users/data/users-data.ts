// frontend/app/(admin)/users/data/users-data.ts
//
// Admin Users data layer.
// Interfaces match the UsersController output exactly.

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ── Interfaces matching UsersController output ────────────────────────

export interface ActiveUser {
  id: string | number;
  name: string;
  email: string;
  phoneNumber: string | null;
  status: string | null;
  commuterType: string | null;
  languagePreference: string | null;
  idImageUrl: string | null;
}

export interface PendingRequest {
  id: string | number;
  name: string;
  email: string;
  phoneNumber: string | null;
  commuterType: string | null;
  languagePreference: string | null;
  idImageUrl: string | null;
  status: 'Pending Verification';
}

export interface RejectedUser {
  id: string | number;
  name: string;
  email: string;
  phoneNumber: string | null;
  commuterType: string | null;
  languagePreference: string | null;
  idImageUrl: string | null;
  status: 'Rejected';
  rejectionReason: string;
}

export interface HistoryLog {
  id: string;
  date: string | null;
  action: string;
  details: string;
}

// ── Consolidated data shape ───────────────────────────────────────────

export interface UsersData {
  activeUsers: ActiveUser[];
  pendingRequests: PendingRequest[];
  rejectedUsers: RejectedUser[];
  historyLogs: Record<string, HistoryLog[]>;
}

// ── API response shapes ───────────────────────────────────────────────

interface UsersListResponse {
  activeUsers: ActiveUser[];
  pendingRequests: PendingRequest[];
  rejectedUsers: RejectedUser[];
}

interface UserHistoryResponse {
  historyLogs: HistoryLog[];
}

// ── Hook ──────────────────────────────────────────────────────────────

const EMPTY_DATA: UsersData = {
  activeUsers: [],
  pendingRequests: [],
  rejectedUsers: [],
  historyLogs: {},
};

export function useUsersData() {
  const [data, setData] = useState<UsersData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<UsersListResponse>('/api/admin/users');
      setData({
        activeUsers: result.activeUsers ?? [],
        pendingRequests: result.pendingRequests ?? [],
        rejectedUsers: result.rejectedUsers ?? [],
        historyLogs: {},
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load users data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserHistory = useCallback(async (userId: string): Promise<HistoryLog[]> => {
    try {
      const result = await apiGet<UserHistoryResponse>(`/api/admin/users/${userId}/history`);
      const logs = result.historyLogs ?? [];
      setData((prev) => ({
        ...prev,
        historyLogs: {
          ...prev.historyLogs,
          [userId]: logs,
        },
      }));
      return logs;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch, setData, fetchUserHistory };
}