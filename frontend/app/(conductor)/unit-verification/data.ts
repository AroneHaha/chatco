// app/(conductor)/unit-verification/data.ts
export interface Unit {
  id: string;
  unitNumber: string;
  plateNumber: string;
  route: string;
  status: "available" | "in-use" | "maintenance";
}

export interface Driver {
  id: string;
  name: string;
  status: "available" | "on-shift";
}

// Mock current logged-in conductor (In real app, this comes from Auth Context)
export const CURRENT_CONDUCTOR = {
  id: "COND-001",
  name: "Mark",
};

export const UNIT_LIST: Unit[] = [
  { id: "UNIT-001", unitNumber: "RIZ 2024", plateNumber: "NBY-4521", route: "Meycauayan – Calumpit", status: "available" },
  { id: "UNIT-002", unitNumber: "RIZ 2025", plateNumber: "MBK-7832", route: "Meycauayan – Malolos", status: "available" },
  { id: "UNIT-003", unitNumber: "RIZ 2026", plateNumber: "BLT-1094", route: "Meycauayan – Bocaue", status: "maintenance" },
  { id: "UNIT-004", unitNumber: "RIZ 2027", plateNumber: "SVR-3367", route: "Marilao – Calumpit", status: "in-use" },
];

export const DRIVER_LIST: Driver[] = [
  { id: "DRV-001", name: "Ramon Dela Cruz", status: "available" },
  { id: "DRV-002", name: "Pedro Santos", status: "available" },
  { id: "DRV-003", name: "Jose Garcia", status: "on-shift" },
  { id: "DRV-004", name: "Antonio Reyes", status: "available" },
];