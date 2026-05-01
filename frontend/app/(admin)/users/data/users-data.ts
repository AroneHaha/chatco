// frontend/app/(admin)/users/data/users-data.ts

/* ─── TYPES ─── */
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

/* ─── INITIAL DATA ─── */
export const initialActiveUsers: ActiveUser[] = [
  { id: 1, name: 'Mhaku Jose Manalili', email: 'mhak@gmail.com', phoneNumber: '0917-123-4567', status: 'Active', commuterType: 'Regular', languagePreference: 'English', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=ID' },
  { id: 4, name: 'Mark Arone Dela Cruz', email: 'MArone.c@email.com', phoneNumber: '0918-234-5678', status: 'Active', commuterType: 'Student', languagePreference: 'Filipino', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=ID' },
  { id: 5, name: 'Rod Dulalia', email: 'Rod@gmail.com', phoneNumber: '0923-324-4327', status: 'Active', commuterType: 'Regular', languagePreference: 'English', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=ID' },
];

export const initialPendingRequests: PendingRequest[] = [
  { id: 'REQ-101', name: 'Marinel Carbonel', email: 'Mari.C@email.com', phoneNumber: '0919-345-6789', commuterType: 'PWD', languagePreference: 'English', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=PWD+ID', status: 'Pending Verification' },
  { id: 'REQ-102', name: 'Stephen Hawkin', email: 'Jeff.Stephen@email.com', phoneNumber: '0920-456-7890', commuterType: 'PWD', languagePreference: 'Filipino', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=Senior+ID', status: 'Pending Verification' },
];

export const initialRejectedUsers: RejectedUser[] = [
  { id: 'REQ-099', name: 'Fake Account', email: 'fake@email.com', phoneNumber: '0000-000-0000', commuterType: 'Regular', languagePreference: 'English', idImageUrl: 'https://placehold.co/150x150/0A1E33/FFFFFF?text=Fake+ID', status: 'Rejected', rejectionReason: 'Invalid ID provided.' },
];

export const initialHistoryLogs: Record<string, HistoryLog[]> = {
  "1": [
    { id: 'H10', date: '2024-05-01 08:00 AM', action: 'Commuter Type Updated', details: 'Changed from Student to Regular. Updated by Admin.' },
    { id: 'H9', date: '2024-04-20 07:15 AM', action: 'Trip Payment', details: 'Malolos Terminal → Meycauayan Crossing. Paid ₱25.00 via Chatco Wallet.' },
    { id: 'H8', date: '2024-04-02 09:00 AM', action: 'Wallet Top-up', details: 'Loaded ₱300.00 via Over-the-Counter.' },
    { id: 'H7', date: '2024-03-15 08:20 AM', action: 'Trip Payment', details: 'Malolos Terminal → Calumpit Town Proper. Paid ₱35.00 via Chatco Wallet.' },
    { id: 'H6', date: '2024-03-01 10:00 AM', action: 'Wallet Top-up', details: 'Loaded ₱1,000.00 via Maya.' },
    { id: 'H5', date: '2024-02-10 06:30 PM', action: 'Trip Payment', details: 'Meycauayan Crossing → Calumpit Town Proper. Paid ₱20.00 via Chatco Wallet.' },
    { id: 'H4', date: '2024-02-05 08:10 AM', action: 'Trip Payment', details: 'Malolos Terminal → Meycauayan Crossing. Paid ₱25.00 via Chatco Wallet.' },
    { id: 'H3', date: '2024-02-01 07:45 AM', action: 'Wallet Top-up', details: 'Loaded ₱500.00 via GCash.' },
    { id: 'H2', date: '2024-01-15 09:35 AM', action: 'Registration Approved', details: 'Valid ID submitted. Approved by Admin.' },
    { id: 'H1', date: '2024-01-15 09:30 AM', action: 'Account Created', details: 'Account registered through the mobile app.' },
  ],

  "4": [
    { id: 'H9', date: '2024-05-10 09:20 AM', action: 'Reported Lost Item', details: 'Reported a Brown Wallet lost on Unit XQJ 4728.' },
    { id: 'H8', date: '2024-04-15 06:50 AM', action: 'Trip Payment', details: 'Calumpit Town Proper → Malolos Terminal. Paid ₱30.00 (Student Discount) via Chatco Wallet.' },
    { id: 'H7', date: '2024-04-01 07:10 AM', action: 'Trip Payment', details: 'Malolos Terminal → Calumpit Town Proper. Paid ₱30.00 (Student Discount) via Chatco Wallet.' },
    { id: 'H6', date: '2024-03-20 10:30 AM', action: 'Wallet Top-up', details: 'Loaded ₱500.00 via GCash.' },
    { id: 'H5', date: '2024-03-05 08:45 AM', action: 'Trip Payment', details: 'Meycauayan Crossing → Calumpit Town Proper. Paid ₱15.00 (Student Discount) via Chatco Wallet.' },
    { id: 'H4', date: '2024-02-25 07:30 AM', action: 'Trip Payment', details: 'Malolos Terminal → Meycauayan Crossing. Paid ₱20.00 (Student Discount) via Chatco Wallet.' },
    { id: 'H3', date: '2024-02-20 07:00 AM', action: 'Wallet Top-up', details: 'Loaded ₱200.00 via GCash.' },
    { id: 'H2', date: '2024-02-10 02:20 PM', action: 'Registration Approved', details: 'Student ID submitted. Approved by Admin.' },
    { id: 'H1', date: '2024-02-10 02:15 PM', action: 'Account Created', details: 'Account registered through the mobile app.' },
  ],
  "5": [
    { id: 'H5', date: '2024-04-01 03:00 PM', action: 'Account Deactivated', details: 'Account deactivated due to inactivity. Actioned by Admin.' },
    { id: 'H4', date: '2024-03-12 07:30 AM', action: 'Trip Payment', details: 'Malolos Terminal → Meycauayan Crossing. Paid ₱25.00 via Chatco Wallet.' },
    { id: 'H3', date: '2024-03-10 08:00 AM', action: 'Wallet Top-up', details: 'Loaded ₱150.00 via GCash.' },
    { id: 'H2', date: '2024-03-01 11:05 AM', action: 'Registration Approved', details: 'Valid ID submitted. Approved by Admin.' },
    { id: 'H1', date: '2024-03-01 11:00 AM', action: 'Account Created', details: 'Account registered through the mobile app.' },
  ],
  "REQ-101": [
    { id: 'H1', date: '2024-05-18 01:30 PM', action: 'Registration Submitted', details: 'Onsite registration submitted at Malolos Terminal. PWD ID uploaded for verification.' },
  ],
  "REQ-102": [
    { id: 'H1', date: '2024-05-19 10:00 AM', action: 'Registration Submitted', details: 'Onsite registration submitted at Meycauayan Crossing. Senior Citizen ID uploaded for verification.' },
  ],
  "REQ-099": [
    { id: 'H2', date: '2024-05-16 09:00 AM', action: 'Registration Rejected', details: 'Invalid ID provided. ID image was blurry and unreadable.' },
    { id: 'H1', date: '2024-05-15 04:00 PM', action: 'Registration Submitted', details: 'Registration submitted via mobile app.' },
  ],
};