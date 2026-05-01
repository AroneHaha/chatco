// app/(admin)/vehicles/data/vehicles-data.ts

export interface Personnel {
  id: number;
  name: string;
  role: 'Driver' | 'Conductor';
  contact: string;
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

export interface TerminatedPersonnel {
  id: number;
  name: string;
  role: string;
  contact: string;
  status: 'Terminated' | 'Resigned';
  reason: string;
  terminatedDate: string;
  lastVehicle: string;
}

export interface ShiftLog {
  id: string;
  personnelName: string;
  role: string;
  vehicle: string;
  shiftDate: string;
  details: string;
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

// Canonical personnel list (used by VehicleTable, PersonnelTable, and all modals)
export const initialPersonnel: Personnel[] = [
  { id: 1, name: "Boy Pick-Up Dela Cruz", role: "Driver", contact: "0917-123-4567" },
  { id: 2, name: "Nardo Putik", role: "Conductor", contact: "0918-234-5678" },
  { id: 3, name: "Tikboy Saksakan", role: "Driver", contact: "0919-345-6789" },
  { id: 4, name: "Jobert Sucaldito", role: "Conductor", contact: "0920-456-7890" },
  { id: 5, name: "Dodong Bullet", role: "Driver", contact: "0921-567-8901" },
  { id: 6, name: "Kolokoy Gwapings", role: "Conductor", contact: "0922-678-9012" },
  { id: 7, name: "Mang Juan Tamad", role: "Driver", contact: "0923-789-0123" },
  { id: 8, name: "Moymoy Palaboy", role: "Conductor", contact: "0924-890-1234" },
  { id: 9, name: "Jepoy Pogi", role: "Driver", contact: "0925-901-2345" },
  { id: 10, name: "Apeng Daldal", role: "Conductor", contact: "0926-012-3456" },
  { id: 11, name: "Cardo Dalisay", role: "Driver", contact: "0927-123-4568" },
  { id: 12, name: "Chokolang Sosyal", role: "Conductor", contact: "0928-234-5679" },
  { id: 13, name: "Kakang Berto", role: "Driver", contact: "0929-345-6780" },
  { id: 14, name: "Bebe Kikay", role: "Conductor", contact: "0930-456-7891" },
  { id: 15, name: "Rocky Salumbides", role: "Driver", contact: "0931-567-8902" },
  { id: 16, name: "Elmer Supsup", role: "Conductor", contact: "0932-678-9013" },
  { id: 17, name: "Bunsoy Reacts", role: "Driver", contact: "0933-789-0124" },
  { id: 18, name: "Waway Gwapito", role: "Conductor", contact: "0934-890-1235" },
  { id: 19, name: "Tito Bobot", role: "Driver", contact: "0935-901-2346" },
  { id: 20, name: "Kokoy Palaboy", role: "Conductor", contact: "0936-012-3457" },
];

// Vehicles — driver/conductor names must match entries in initialPersonnel
export const initialVehicles: Vehicle[] = [
  { id: 1, plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', driver: 'Boy Pick-Up Dela Cruz', conductor: 'Nardo Putik', status: 'Operating', speed: 35 },
  { id: 2, plateNumber: 'GHI-9012', route: 'Meycauayan–Calumpit', driver: 'Tikboy Saksakan', conductor: 'Jobert Sucaldito', status: 'Under Maintenance', speed: 0 },
  { id: 3, plateNumber: 'JKL-3456', route: 'Meycauayan–Calumpit', driver: 'Dodong Bullet', conductor: null, status: 'Out of Service / Damaged', speed: 0 },
  { id: 4, plateNumber: 'ABC-1234', route: 'Meycauayan–Calumpit', driver: 'Mang Juan Tamad', conductor: 'Kolokoy Gwapings', status: 'Operating', speed: 25 },
];

// Terminated / resigned personnel (shown in Records & History tab)
export const initialTerminatedPersonnel: TerminatedPersonnel[] = [
  { id: 6, name: 'Rizal Santiago', role: 'Driver', contact: '0917-123-4567', status: 'Terminated', reason: 'Repeated policy violations', terminatedDate: '2024-04-15', lastVehicle: 'XQJ 4728' },
  { id: 7, name: 'Mark Arone', role: 'Conductor', contact: '0918-987-6543', status: 'Terminated', reason: 'Gross negligence', terminatedDate: '2024-04-28', lastVehicle: 'VMY 9183' },
  { id: 8, name: 'Elaine Benitez', role: 'Driver', contact: '0919-555-1234', status: 'Resigned', reason: 'Health reasons', terminatedDate: '2024-05-02', lastVehicle: 'LKW 3579' },
];

// Shift history logs for both active and terminated personnel
export const initialShiftHistoryLog: ShiftLog[] = [
  { id: 'LOG-001', personnelName: 'Rizal Santiago', role: 'Driver', vehicle: 'XQJ 4728', shiftDate: '2024-04-14', details: 'Last active shift before termination.' },
  { id: 'LOG-002', personnelName: 'Mark Arone', role: 'Conductor', vehicle: 'VMY 9183', shiftDate: '2024-04-27', details: 'Involved in cash handling discrepancy.' },
  { id: 'LOG-003', personnelName: 'Elaine Benitez', role: 'Driver', vehicle: 'LKW 3579', shiftDate: '2024-05-01', details: 'Resignation effective end of shift.' },
  { id: 'LOG-004', personnelName: 'Jose Ngani', role: 'Conductor', vehicle: 'XQJ 4728', shiftDate: '2024-05-10', details: 'Regular shift completion. Vehicle handed over.' },
  { id: 'LOG-005', personnelName: 'Boy Pick-Up Dela Cruz', role: 'Driver', vehicle: 'DEF-5678', shiftDate: '2024-05-12', details: 'Regular shift. No incidents.' },
  { id: 'LOG-006', personnelName: 'Nardo Putik', role: 'Conductor', vehicle: 'DEF-5678', shiftDate: '2024-05-12', details: 'Shift completed. Collections remitted.' },
  { id: 'LOG-007', personnelName: 'Tikboy Saksakan', role: 'Driver', vehicle: 'GHI-9012', shiftDate: '2024-05-08', details: 'Reported vehicle issue. Sent for maintenance.' },
  { id: 'LOG-008', personnelName: 'Dodong Bullet', role: 'Driver', vehicle: 'JKL-3456', shiftDate: '2024-05-06', details: 'Vehicle damaged mid-route. Tow requested.' },
];
