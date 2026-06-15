// frontend/app/(admin)/users/data/users-data.ts

import { useState, useCallback } from 'react';

// ─── Interfaces (kept as API contracts) ───

export interface ActiveUser {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  status: 'Active' | 'Inactive';
  commuterType: 'Regular' | 'Student' | 'Senior Citizen' | 'PWD';
  languagePreference: 'English' | 'Filipino';
  idImageUrl: string;
}

export interface PendingRequest {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  commuterType: 'Regular' | 'Student' | 'Senior Citizen' | 'PWD';
  languagePreference: 'English' | 'Filipino';
  idImageUrl: string;
  status: 'Pending Verification';
}

export interface RejectedUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  commuterType: 'Regular' | 'Student' | 'Senior Citizen' | 'PWD';
  languagePreference: 'English' | 'Filipino';
  idImageUrl: string;
  status: 'Rejected';
  rejectionReason: string;
}

export interface HistoryLog {
  id: string;
  date: string;
  action: string;
  details: string;
}

// ─── Consolidated data shape ───

export interface UsersData {
  activeUsers: ActiveUser[];
  pendingRequests: PendingRequest[];
  rejectedUsers: RejectedUser[];
  historyLogs: Record<string, HistoryLog[]>;
}

// ─── Mock data (consolidated for easy future deletion) ───

export const MOCK_USERS_DATA: UsersData = {
  activeUsers: [
    { id: 1, name: 'Mhaku Jose Manalili', email: 'mhak@gmail.com', phoneNumber: '0917-123-4567', status: 'Active', commuterType: 'Regular', languagePreference: 'English', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=ID' },
    { id: 4, name: 'Mark Arone Dela Cruz', email: 'MArone.c@email.com', phoneNumber: '0918-234-5678', status: 'Active', commuterType: 'Student', languagePreference: 'Filipino', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=ID' },
    { id: 5, name: 'Rod Dulalia', email: 'Rod@gmail.com', phoneNumber: '0923-324-4327', status: 'Active', commuterType: 'Regular', languagePreference: 'English', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=ID' },
  ],

  pendingRequests: [
    { id: 'REQ-101', name: 'Marinel Carbonel', email: 'Mari.C@email.com', phoneNumber: '0919-345-6789', commuterType: 'PWD', languagePreference: 'English', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=PWD+ID', status: 'Pending Verification' },
    { id: 'REQ-102', name: 'Stephen Hawkin', email: 'Jeff.Stephen@email.com', phoneNumber: '0920-456-7890', commuterType: 'PWD', languagePreference: 'Filipino', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=Senior+ID', status: 'Pending Verification' },
  ],

  rejectedUsers: [
    { id: 'REQ-099', name: 'Fake Account', email: 'fake@email.com', phoneNumber: '0000-000-0000', commuterType: 'Regular', languagePreference: 'English', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=Fake+ID', status: 'Rejected', rejectionReason: 'Invalid ID provided.' },
  ],

  historyLogs: {
    "1": [
      { id: 'H9', date: '2024-04-20 07:15 AM', action: 'Trip Payment', details: 'Malolos Terminal → Meycauayan Crossing. Paid ₱25.00 via GCash.' },
      { id: 'H7', date: '2024-03-15 08:20 AM', action: 'Trip Payment', details: 'Malolos Terminal → Calumpit Town Proper. Paid ₱35.00 via GCash.' },
      { id: 'H5', date: '2024-02-10 06:30 PM', action: 'Trip Payment', details: 'Meycauayan Crossing → Calumpit Town Proper. Paid ₱20.00 via Cash.' },
      { id: 'H4', date: '2024-02-05 08:10 AM', action: 'Trip Payment', details: 'Malolos Terminal → Meycauayan Crossing. Paid ₱25.00 via GCash.' },
      { id: 'H3', date: '2024-02-20 07:00 AM', action: 'Voucher Redeemed', details: 'Free ride voucher earned after 10 rides.' },
    ],
    "4": [
      { id: 'H8', date: '2024-04-15 06:50 AM', action: 'Trip Payment', details: 'Calumpit Town Proper → Malolos Terminal. Paid ₱30.00 (Student Discount) via GCash.' },
      { id: 'H7', date: '2024-04-01 07:10 AM', action: 'Trip Payment', details: 'Malolos Terminal → Calumpit Town Proper. Paid ₱30.00 (Student Discount) via GCash.' },
      { id: 'H6', date: '2024-03-20 10:30 AM', action: 'Voucher Redeemed', details: 'Free ride voucher earned after 10 rides.' },
      { id: 'H5', date: '2024-03-05 08:45 AM', action: 'Trip Payment', details: 'Meycauayan Crossing → Calumpit Town Proper. Paid ₱15.00 (Student Discount) via Cash.' },
      { id: 'H4', date: '2024-02-25 07:30 AM', action: 'Trip Payment', details: 'Malolos Terminal → Meycauayan Crossing. Paid ₱20.00 (Student Discount) via GCash.' },
      { id: 'H3', date: '2024-02-20 07:00 AM', action: 'Voucher Redeemed', details: 'Free ride voucher earned after 10 rides.' },
    ],
    "5": [
      { id: 'H4', date: '2024-03-12 07:30 AM', action: 'Trip Payment', details: 'Malolos Terminal → Meycauayan Crossing. Paid ₱25.00 via GCash.' },
      { id: 'H3', date: '2024-02-20 07:00 AM', action: 'Voucher Redeemed', details: 'Free ride voucher earned after 10 rides.' },
    ],
    "REQ-101": [
      { id: 'H3', date: '2024-03-20 07:00 AM', action: 'Voucher Redeemed', details: 'Free ride voucher earned after 10 rides.' },
    ],
    "REQ-102": [
      { id: 'H3', date: '2024-03-20 07:00 AM', action: 'Voucher Redeemed', details: 'Free ride voucher earned after 10 rides.' },
    ],
    "REQ-099": [],
  },
};

// ─── Hook (mock for now, swap with API later) ───

export function useUsersData() {
  const [data, setData] = useState<UsersData>(MOCK_USERS_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    // TODO: Replace with actual API call
    setTimeout(() => {
      setData(MOCK_USERS_DATA);
      setIsLoading(false);
    }, 500);
  }, []);

  return { data, isLoading, error, refetch, setData };
}