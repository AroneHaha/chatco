// app/(admin)/remittance/data/remittance-data.ts

export type RemittanceStatus = 'Pending' | 'Remitted';

export interface Remittance {
  id: string;
  conductor: string;
  vehicle: string;
  date: string;
  amount: string;
  status: RemittanceStatus;
}

// Replace this array with API call when backend is ready
export const initialRemittanceData: Remittance[] = [
  { id: 'S-101', conductor: 'Jose Ngani', vehicle: 'XQJ 4728', date: '2024-05-01', amount: '₱2,500.00', status: 'Remitted' },
  { id: 'S-102', conductor: 'Mark Pakak', vehicle: 'VMY 9183', date: '2024-05-01', amount: '₱2,450.00', status: 'Pending' },
  { id: 'S-103', conductor: 'Ericks Son', vehicle: 'LKW 3579', date: '2024-05-02', amount: '₱2,600.00', status: 'Remitted' },
  { id: 'S-104', conductor: 'Rinel Trinel', vehicle: 'TNB 8462', date: '2024-05-03', amount: '₱2,550.00', status: 'Remitted' },
  { id: 'S-105', conductor: 'Leon Barbel', vehicle: 'PVR 6894', date: '2024-05-04', amount: '₱2,400.00', status: 'Pending' },
  { id: 'S-106', conductor: 'Jose Ngani', vehicle: 'XQJ 4728', date: '2024-05-05', amount: '₱2,350.00', status: 'Remitted' },
  { id: 'S-107', conductor: 'Mark Pakak', vehicle: 'VMY 9183', date: '2024-05-05', amount: '₱2,480.00', status: 'Remitted' },
  { id: 'S-108', conductor: 'Ericks Son', vehicle: 'LKW 3579', date: '2024-05-06', amount: '₱2,700.00', status: 'Pending' },
  { id: 'S-109', conductor: 'Rinel Trinel', vehicle: 'TNB 8462', date: '2024-05-06', amount: '₱2,520.00', status: 'Remitted' },
  { id: 'S-110', conductor: 'Leon Barbel', vehicle: 'PVR 6894', date: '2024-05-07', amount: '₱2,460.00', status: 'Remitted' },
  { id: 'S-111', conductor: 'Jose Ngani', vehicle: 'XQJ 4728', date: '2024-05-08', amount: '₱2,300.00', status: 'Pending' },
  { id: 'S-112', conductor: 'Mark Pakak', vehicle: 'VMY 9183', date: '2024-05-08', amount: '₱2,550.00', status: 'Remitted' },
  { id: 'S-113', conductor: 'Ericks Son', vehicle: 'LKW 3579', date: '2024-05-09', amount: '₱2,650.00', status: 'Remitted' },
  { id: 'S-114', conductor: 'Rinel Trinel', vehicle: 'TNB 8462', date: '2024-05-09', amount: '₱2,400.00', status: 'Pending' },
  { id: 'S-115', conductor: 'Leon Barbel', vehicle: 'PVR 6894', date: '2024-05-10', amount: '₱2,580.00', status: 'Remitted' },
];