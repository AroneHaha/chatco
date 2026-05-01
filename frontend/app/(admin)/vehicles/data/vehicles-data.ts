// app/(admin)/vehicles/data/vehicles-data.ts

export interface Personnel {
  id: number;
  name: string;
  role: 'Driver' | 'Conductor';
}

export interface Vehicle {
  id: number;
  plateNumber: string;
  route: string;
  driver: string | null;
  conductor: string | null;
  status: 'Operating' | 'Under Maintenance' | 'Out of Service / Damaged';
  speed: number;
}

// Extracted Live Map Tracking Data (to be used for live fleet tracking/map)
export interface LiveTrackingData {
  unit: string;
  driver: string;
  speed: number;
  status: "normal" | "overspeeding" | "idle";
  zone: string;
}

export const liveTrackingFleet: LiveTrackingData[] = [
  { unit: "XQJ 4728", driver: "Mhaku Jose Manalili", speed: 28, status: "normal", zone: "Malolos" },
  { unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 62, status: "overspeeding", zone: "Malolos–Meycauayan" },
  { unit: "RZP 6041", driver: "Rod Erick Dulalia", speed: 25, status: "normal", zone: "Meycauayan" },
  { unit: "LKW 3579", driver: "Marinel Carbonel", speed: 0, status: "idle", zone: "Meycauayan" },
  { unit: "TNB 8462", driver: "Nardong Putik", speed: 68, status: "overspeeding", zone: "Meycauayan–Calumpit" },
  { unit: "JHX 7905", driver: "Karding Dela Paz", speed: 30, status: "normal", zone: "Calumpit" },
  { unit: "PVR 6894", driver: "Nikola Tekla", speed: 27, status: "normal", zone: "Calumpit" },
  { unit: "QFD 2316", driver: "Alden Recharge", speed: 32, status: "normal", zone: "Malolos–Meycauayan" },
];

export const mockPersonnel: Personnel[] = [
  { id: 1, name: 'Pedro Cruz', role: 'Driver' },
  { id: 2, name: 'Juan Santos', role: 'Conductor' },
  { id: 3, name: 'Carlos Reyes', role: 'Driver' },
  { id: 4, name: 'Miguel Garcia', role: 'Conductor' },
  { id: 5, name: 'Luis Martinez', role: 'Driver' },
  { id: 6, name: 'Ana Lopez', role: 'Conductor' },
  { id: 7, name: 'Mark Unassigned', role: 'Driver' },
  { id: 8, name: 'Joy Unassigned', role: 'Conductor' },
];

export const initialVehicles: Vehicle[] = [
  { id: 1, plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', driver: 'Pedro Cruz', conductor: 'Juan Santos', status: 'Operating', speed: 35 },
  { id: 2, plateNumber: 'GHI-9012', route: 'Meycauayan–Calumpit', driver: 'Carlos Reyes', conductor: 'Miguel Garcia', status: 'Under Maintenance', speed: 0 },
  { id: 3, plateNumber: 'JKL-3456', route: 'Meycauayan–Calumpit', driver: 'Luis Martinez', conductor: null, status: 'Out of Service / Damaged', speed: 0 },
  { id: 4, plateNumber: 'ABC-1234', route: 'Meycauayan–Calumpit', driver: 'Juan Santos', conductor: 'Ana Lopez', status: 'Operating', speed: 25 },
];