// src/lib/conductor/persistence/shift.store.ts

export interface ConductorShift {
  shiftId: string;
  conductorName: string;
  unitNumber: string;
  plateNumber?: string;
  route: string;
  driverName: string;
  timeIn: string;
  timeOut: string | null;
  isActive: boolean;
}
