// app/(admin)/receipts/data/receipts-data.ts
export interface Receipt {
  id: string;
  commuterName: string;
  commuterId: string;
  plateNumber: string;
  route: string;
  fare: number;
  paymentMethod: 'Wallet' | 'Voucher';
  status: 'Completed';
  date: string;
  time: string;
}

export type ReceiptStatus = Receipt['status'];
export type PaymentMethod = Receipt['paymentMethod'];

export const initialReceiptData: Receipt[] = [
  { id: 'RC-2024001', commuterName: 'Mhaku Jose Manalili', commuterId: 'USR-001', plateNumber: 'ABC-1234', route: 'Meycauayan → Calumpit Exit', fare: 15.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-15', time: '08:23 AM' },
  { id: 'RC-2024002', commuterName: 'Mark Arone Dela Cruz', commuterId: 'USR-004', plateNumber: 'DEF-5678', route: 'Meycauayan → Calumpit Exit', fare: 12.50, paymentMethod: 'Voucher', status: 'Completed', date: '2024-12-15', time: '08:45 AM' },
  { id: 'RC-2024003', commuterName: 'Rod Dulalia', commuterId: 'USR-005', plateNumber: 'GHI-9012', route: 'Meycauayan → Calumpit Exit', fare: 18.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-15', time: '09:10 AM' },
  { id: 'RC-2024004', commuterName: 'Juan Dela Cruz', commuterId: 'COM-001', plateNumber: 'JKL-3456', route: 'Meycauayan → Calumpit Exit', fare: 25.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-14', time: '07:30 AM' },
  { id: 'RC-2024005', commuterName: 'Maria Santos', commuterId: 'COM-002', plateNumber: 'MNO-7890', route: 'Meycauayan → Calumpit Exit', fare: 15.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-14', time: '09:05 AM' },
  { id: 'RC-2024006', commuterName: 'Jose Rizal', commuterId: 'COM-003', plateNumber: 'PQR-1234', route: 'Calumpit → Kapitolyo', fare: 20.00, paymentMethod: 'Voucher', status: 'Completed', date: '2024-12-14', time: '10:15 AM' },
  { id: 'RC-2024007', commuterName: 'Ana Reyes', commuterId: 'COM-004', plateNumber: 'STU-5678', route: 'Meycauayan → Calumpit Exit', fare: 12.50, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-13', time: '06:45 AM' },
  { id: 'RC-2024008', commuterName: 'Pedro Garcia', commuterId: 'COM-005', plateNumber: 'VWX-9012', route: 'Monumento → Divisoria', fare: 18.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-13', time: '08:00 AM' },
  { id: 'RC-2024009', commuterName: 'Rosa Lim', commuterId: 'COM-006', plateNumber: 'YZA-3456', route: 'Meycauayan → Calumpit Exit', fare: 25.00, paymentMethod: 'Voucher', status: 'Completed', date: '2024-12-13', time: '09:20 AM' },
  { id: 'RC-2024010', commuterName: 'Carlos Mendoza', commuterId: 'COM-007', plateNumber: 'BCD-7890', route: 'Meycauayan → Calumpit Exit', fare: 15.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-12', time: '07:15 AM' },
  { id: 'RC-2024011', commuterName: 'Sofia Tan', commuterId: 'COM-008', plateNumber: 'EFG-1234', route: 'Meycauayan → Calumpit Exit', fare: 20.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-12', time: '08:30 AM' },
  { id: 'RC-2024012', commuterName: 'Miguel Cruz', commuterId: 'COM-009', plateNumber: 'HIJ-5678', route: 'Malolos → Calumpit Exit', fare: 12.50, paymentMethod: 'Voucher', status: 'Completed', date: '2024-12-12', time: '10:00 AM' },
  { id: 'RC-2024013', commuterName: 'Isabella Rivera', commuterId: 'COM-010', plateNumber: 'KLM-9012', route: 'Meycauayan → Calumpit Exit', fare: 18.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-11', time: '07:00 AM' },
  { id: 'RC-2024014', commuterName: 'Andres Santos', commuterId: 'COM-011', plateNumber: 'NOP-3456', route: 'Calumpit → Kapitolyo', fare: 25.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-11', time: '09:45 AM' },
  { id: 'RC-2024015', commuterName: 'Carmen Garcia', commuterId: 'COM-012', plateNumber: 'QRS-7890', route: 'Malolos → Calumpit Exit', fare: 15.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-11', time: '11:20 AM' },
  { id: 'RC-2024016', commuterName: 'Gabriela Torres', commuterId: 'COM-013', plateNumber: 'TUV-1234', route: 'Malolos → Calumpit Exit', fare: 20.00, paymentMethod: 'Voucher', status: 'Completed', date: '2024-12-10', time: '06:30 AM' },
  { id: 'RC-2024017', commuterName: 'Fernando Lopez', commuterId: 'COM-014', plateNumber: 'WXY-5678', route: 'Meycauayan → Calumpit Exit', fare: 12.50, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-10', time: '08:15 AM' },
  { id: 'RC-2024018', commuterName: 'Daniela Rivera', commuterId: 'COM-015', plateNumber: 'ZAB-9012', route: 'Malolos → Calumpit Exit' , fare: 18.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-10', time: '09:50 AM' },
  { id: 'RC-2024019', commuterName: 'Antonio Villanueva', commuterId: 'COM-016', plateNumber: 'CDE-2345', route: 'Calumpit → Kapitolyo', fare: 25.00, paymentMethod: 'Wallet', status: 'Completed', date: '2024-12-09', time: '07:45 AM' },
  { id: 'RC-2024020', commuterName: 'Patricia Cheng', commuterId: 'COM-017', plateNumber: 'FGH-6789', route: 'Malolos → Calumpit Exit', fare: 15.00, paymentMethod: 'Voucher', status: 'Completed', date: '2024-12-09', time: '10:30 AM' },
];
