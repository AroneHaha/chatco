// app/(admin)/vehicles/data/vehicles-data.ts

export interface Personnel {
  id: number;
  name: string;
  role: 'Driver' | 'Conductor';
  contact: string;
  profilePic: string;
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
  { id: 1, name: "Boy Pick-Up Dela Cruz", role: "Driver", contact: "0917-123-4567", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=BP" },
  { id: 2, name: "Nardo Putik", role: "Conductor", contact: "0918-234-5678", profilePic: "https://placehold.co/150x150/0A1E33/F59E0B?text=NP" },
  { id: 3, name: "Tikboy Saksakan", role: "Driver", contact: "0919-345-6789", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=TS" },
  { id: 4, name: "Jobert Sucaldito", role: "Conductor", contact: "0920-456-7890", profilePic: "https://placehold.co/150x150/0A1E33/F59E0B?text=JS" },
  { id: 5, name: "Dodong Bullet", role: "Driver", contact: "0921-567-8901", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=DB" },
  { id: 6, name: "Kolokoy Gwapings", role: "Conductor", contact: "0922-678-9012", profilePic: "https://placehold.co/150x150/0A1E33/F59E0B?text=KG" },
  { id: 7, name: "Mang Juan Tamad", role: "Driver", contact: "0923-789-0123", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=MJ" },
  { id: 8, name: "Moymoy Palaboy", role: "Conductor", contact: "0924-890-1234", profilePic: "https://placehold.co/150x150/0A1E33/F59E0B?text=MP" },
  { id: 9, name: "Jepoy Pogi", role: "Driver", contact: "0925-901-2345", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=JP" },
  { id: 10, name: "Apeng Daldal", role: "Conductor", contact: "0926-012-3456", profilePic: "https://placehold.co/150x150/0A1E33/F59E0B?text=AD" },
  { id: 11, name: "Cardo Dalisay", role: "Driver", contact: "0927-123-4568", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=CD" },
  { id: 12, name: "Chokolang Sosyal", role: "Conductor", contact: "0928-234-5679", profilePic: "https://placehold.co/150x150/0A1E33/F59E0B?text=CS" },
  { id: 13, name: "Kakang Berto", role: "Driver", contact: "0929-345-6780", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=KB" },
  { id: 14, name: "Bebe Kikay", role: "Conductor", contact: "0930-456-7891", profilePic: "https://placehold.co/150x150/0A1E33/F59E0B?text=BK" },
  { id: 15, name: "Rocky Salumbides", role: "Driver", contact: "0931-567-8902", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=RS" },
  { id: 16, name: "Elmer Supsup", role: "Conductor", contact: "0932-678-9013", profilePic: "https://placehold.co/150x150/0A1E33/F59E0B?text=ES" },
  { id: 17, name: "Bunsoy Reacts", role: "Driver", contact: "0933-789-0124", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=BR" },
  { id: 18, name: "Waway Gwapito", role: "Conductor", contact: "0934-890-1235", profilePic: "https://placehold.co/150x150/0A1E33/F59E0B?text=WG" },
  { id: 19, name: "Tito Bobot", role: "Driver", contact: "0935-901-2346", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=TB" },
  { id: 20, name: "Kokoy Palaboy", role: "Conductor", contact: "0936-012-3457", profilePic: "https://placehold.co/150x150/0A1E33/F59E0B?text=KP" },
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

/* ─── DRIVER RATINGS (commuter → driver only) ─── */
export interface DriverRating {
  id: string;
  date: string;
  commuterName: string;
  plateNumber: string;
  route: string;
  rating: number; // 1-5
  comment: string;
}

/* ─── DRIVER MESSAGES (admin ↔ commuter about driver) ─── */
export interface DriverMessage {
  id: string;
  date: string;
  sender: 'admin' | 'commuter' | 'system';
  senderName: string;
  message: string;
  type: 'complaint' | 'inquiry' | 'feedback' | 'reply' | 'notice' | 'warning';
}

// Driver-only profiles with extra info
export interface DriverProfile extends Personnel {
  hireDate: string;
  licenseNumber: string;
  licenseExpiry: string;
  totalTrips: number;
  assignedVehicle: string | null;
  assignedRoute: string | null;
}

export const driverProfiles: Record<string, DriverProfile> = {
  "1": { id: 1, name: "Boy Pick-Up Dela Cruz", role: "Driver", contact: "0917-123-4567", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=BP", hireDate: "2022-03-15", licenseNumber: "D1-22-04521", licenseExpiry: "2026-03-15", totalTrips: 1847, assignedVehicle: "DEF-5678", assignedRoute: "Meycauayan–Calumpit" },
  "3": { id: 3, name: "Tikboy Saksakan", role: "Driver", contact: "0919-345-6789", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=TS", hireDate: "2023-01-10", licenseNumber: "D2-23-01234", licenseExpiry: "2027-01-10", totalTrips: 892, assignedVehicle: "GHI-9012", assignedRoute: "Meycauayan–Calumpit" },
  "5": { id: 5, name: "Dodong Bullet", role: "Driver", contact: "0921-567-8901", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=DB", hireDate: "2023-06-01", licenseNumber: "D1-23-06789", licenseExpiry: "2027-06-01", totalTrips: 634, assignedVehicle: "JKL-3456", assignedRoute: "Meycauayan–Calumpit" },
  "7": { id: 7, name: "Mang Juan Tamad", role: "Driver", contact: "0923-789-0123", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=MJ", hireDate: "2021-11-20", licenseNumber: "D1-21-09876", licenseExpiry: "2025-11-20", totalTrips: 2103, assignedVehicle: "ABC-1234", assignedRoute: "Meycauayan–Calumpit" },
  "9": { id: 9, name: "Jepoy Pogi", role: "Driver", contact: "0925-901-2345", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=JP", hireDate: "2024-02-01", licenseNumber: "D2-24-00111", licenseExpiry: "2028-02-01", totalTrips: 156, assignedVehicle: null, assignedRoute: null },
  "11": { id: 11, name: "Cardo Dalisay", role: "Driver", contact: "0927-123-4568", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=CD", hireDate: "2023-08-15", licenseNumber: "D1-23-08222", licenseExpiry: "2027-08-15", totalTrips: 478, assignedVehicle: null, assignedRoute: null },
  "13": { id: 13, name: "Kakang Berto", role: "Driver", contact: "0929-345-6780", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=KB", hireDate: "2022-10-10", licenseNumber: "D2-22-10333", licenseExpiry: "2026-10-10", totalTrips: 1201, assignedVehicle: null, assignedRoute: null },
  "15": { id: 15, name: "Rocky Salumbides", role: "Driver", contact: "0931-567-8902", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=RS", hireDate: "2024-01-08", licenseNumber: "D1-24-01444", licenseExpiry: "2028-01-08", totalTrips: 210, assignedVehicle: null, assignedRoute: null },
  "17": { id: 17, name: "Bunsoy Reacts", role: "Driver", contact: "0933-789-0124", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=BR", hireDate: "2023-04-20", licenseNumber: "D2-23-04555", licenseExpiry: "2027-04-20", totalTrips: 567, assignedVehicle: null, assignedRoute: null },
  "19": { id: 19, name: "Tito Bobot", role: "Driver", contact: "0935-901-2346", profilePic: "https://placehold.co/150x150/0A1E33/62A0EA?text=TB", hireDate: "2022-07-01", licenseNumber: "D1-22-07666", licenseExpiry: "2026-07-01", totalTrips: 1534, assignedVehicle: null, assignedRoute: null },
};

// Ratings keyed by driver personnel ID
export const driverRatings: Record<string, DriverRating[]> = {
  "1": [
    { id: 'DR1', date: '2024-05-12 09:30 AM', commuterName: 'Mhaku Jose Manalili', plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', rating: 5, comment: 'Very smooth drive. Driver was careful and followed traffic rules.' },
    { id: 'DR2', date: '2024-05-10 07:15 AM', commuterName: 'Marinel Carbonel', plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', rating: 5, comment: 'Best driver on this route. Very professional.' },
    { id: 'DR3', date: '2024-05-05 08:00 AM', commuterName: 'Rod Dulalia', plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', rating: 4, comment: 'Good trip. Arrived on time.' },
    { id: 'DR4', date: '2024-04-28 06:45 AM', commuterName: 'Mark Arone Dela Cruz', plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', rating: 4, comment: 'Safe driving. A bit slow but better safe than sorry.' },
    { id: 'DR5', date: '2024-04-20 07:30 AM', commuterName: 'Ana Santos', plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', rating: 5, comment: 'Always greets passengers. Very courteous.' },
    { id: 'DR6', date: '2024-04-15 08:00 AM', commuterName: 'Pedro Cruz', plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', rating: 5, comment: 'Excellent driver. Will ride again!' },
    { id: 'DR7', date: '2024-04-10 06:20 AM', commuterName: 'Grace Tan', plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', rating: 4, comment: 'Smooth and comfortable ride.' },
    { id: 'DR8', date: '2024-04-05 07:45 AM', commuterName: 'Jun Reyes', plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', rating: 5, comment: 'Helped a senior citizen board. Very kind!' },
    { id: 'DR9', date: '2024-03-28 06:50 AM', commuterName: 'Carlo Garcia', plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', rating: 3, comment: 'Average trip. Nothing special.' },
    { id: 'DR10', date: '2024-03-20 07:00 AM', commuterName: 'Maria Lopez', plateNumber: 'DEF-5678', route: 'Meycauayan–Calumpit', rating: 4, comment: 'On time and safe. Good service.' },
  ],
  "3": [
    { id: 'DR1', date: '2024-05-08 07:00 AM', commuterName: 'Pedro Cruz', plateNumber: 'GHI-9012', route: 'Meycauayan–Calumpit', rating: 2, comment: 'Driver was speeding. Very uncomfortable ride.' },
    { id: 'DR2', date: '2024-05-06 06:30 AM', commuterName: 'Maria Lopez', plateNumber: 'GHI-9012', route: 'Meycauayan–Calumpit', rating: 1, comment: 'Sudden braking multiple times. Felt very unsafe. Reported to office.' },
    { id: 'DR3', date: '2024-05-03 07:45 AM', commuterName: 'Carlo Garcia', plateNumber: 'GHI-9012', route: 'Meycauayan–Calumpit', rating: 3, comment: 'Average trip. Nothing special but nothing bad either.' },
    { id: 'DR4', date: '2024-04-28 07:10 AM', commuterName: 'Ana Santos', plateNumber: 'GHI-9012', route: 'Meycauayan–Calumpit', rating: 2, comment: 'Driver was honking aggressively at other vehicles.' },
    { id: 'DR5', date: '2024-04-25 06:55 AM', commuterName: 'Jun Reyes', plateNumber: 'GHI-9012', route: 'Meycauayan–Calumpit', rating: 1, comment: 'Overloaded the vehicle. Standing passengers were at risk.' },
    { id: 'DR6', date: '2024-04-20 07:20 AM', commuterName: 'Grace Tan', plateNumber: 'GHI-9012', route: 'Meycauayan–Calumpit', rating: 2, comment: 'Rude when asked about the route.' },
    { id: 'DR7', date: '2024-04-15 06:40 AM', commuterName: 'Tomas Reyes', plateNumber: 'GHI-9012', route: 'Meycauayan–Calumpit', rating: 4, comment: 'Trip was fine today. On time.' },
    { id: 'DR8', date: '2024-04-10 07:30 AM', commuterName: 'Pedro Cruz', plateNumber: 'GHI-9012', route: 'Meycauayan–Calumpit', rating: 3, comment: 'Vehicle needs maintenance. AC was not working.' },
  ],
  "5": [
    { id: 'DR1', date: '2024-05-06 06:50 AM', commuterName: 'Maria Lopez', plateNumber: 'JKL-3456', route: 'Meycauayan–Calumpit', rating: 5, comment: 'Good driver. Handled the vehicle damage situation calmly.' },
    { id: 'DR2', date: '2024-05-04 07:00 AM', commuterName: 'Tomas Reyes', plateNumber: 'JKL-3456', route: 'Meycauayan–Calumpit', rating: 5, comment: 'Excellent driver. Always on time.' },
    { id: 'DR3', date: '2024-05-01 06:30 AM', commuterName: 'Ana Santos', plateNumber: 'JKL-3456', route: 'Meycauayan–Calumpit', rating: 4, comment: 'Very professional. Clean vehicle.' },
    { id: 'DR4', date: '2024-04-28 07:15 AM', commuterName: 'Jun Reyes', plateNumber: 'JKL-3456', route: 'Meycauayan–Calumpit', rating: 4, comment: 'Smooth ride. Would recommend.' },
    { id: 'DR5', date: '2024-04-25 06:45 AM', commuterName: 'Carlo Garcia', plateNumber: 'JKL-3456', route: 'Meycauayan–Calumpit', rating: 5, comment: 'Safety-conscious driver. Felt secure the whole trip.' },
  ],
  "7": [
    { id: 'DR1', date: '2024-05-10 07:30 AM', commuterName: 'Ana Santos', plateNumber: 'ABC-1234', route: 'Meycauayan–Calumpit', rating: 2, comment: 'Driver was using phone while driving. Very dangerous.' },
    { id: 'DR2', date: '2024-05-09 06:15 AM', commuterName: 'Jun Reyes', plateNumber: 'ABC-1234', route: 'Meycauayan–Calumpit', rating: 2, comment: 'Driver was late picking up at terminal. Caused delay.' },
    { id: 'DR3', date: '2024-05-07 07:45 AM', commuterName: 'Carlo Garcia', plateNumber: 'ABC-1234', route: 'Meycauayan–Calumpit', rating: 2, comment: 'Rude to passengers who asked about the route.' },
    { id: 'DR4', date: '2024-05-05 06:30 AM', commuterName: 'Grace Tan', plateNumber: 'ABC-1234', route: 'Meycauayan–Calumpit', rating: 3, comment: 'Driver seemed tired. Slower than usual.' },
    { id: 'DR5', date: '2024-05-02 07:00 AM', commuterName: 'Maria Lopez', plateNumber: 'ABC-1234', route: 'Meycauayan–Calumpit', rating: 2, comment: 'Playing loud music despite requests to lower it.' },
    { id: 'DR6', date: '2024-04-28 06:50 AM', commuterName: 'Tomas Reyes', plateNumber: 'ABC-1234', route: 'Meycauayan–Calumpit', rating: 4, comment: 'Trip was okay today. No issues.' },
    { id: 'DR7', date: '2024-04-25 07:10 AM', commuterName: 'Pedro Cruz', plateNumber: 'ABC-1234', route: 'Meycauayan–Calumpit', rating: 3, comment: 'Average. Vehicle was clean though.' },
  ],
};

// Messages keyed by driver personnel ID (complaints/feedback threads involving this driver)
export const driverMessages: Record<string, DriverMessage[]> = {
  "1": [
    { id: 'DM1', date: '2024-05-11 10:00 AM', sender: 'commuter', senderName: 'Ana Santos', message: 'I want to commend your driver Boy Pick-Up Dela Cruz on plate DEF-5678. He helped me carry my groceries when I boarded. Very kind!', type: 'feedback' },
    { id: 'DM2', date: '2024-05-11 10:30 AM', sender: 'admin', senderName: 'Admin', message: 'Thank you for the positive feedback, Ana! We will forward this commendation to Boy Pick-Up. We appreciate you taking the time to let us know.', type: 'reply' },
  ],
  "3": [
    { id: 'DM1', date: '2024-05-06 07:00 AM', sender: 'commuter', senderName: 'Maria Lopez', message: 'Your driver Tikboy Saksakan was overspeeding on the Meycauayan–Calumpit route this morning around 6:30 AM. He was driving at least 80kph on a 60kph zone. This is very dangerous!', type: 'complaint' },
    { id: 'DM2', date: '2024-05-06 07:15 AM', sender: 'admin', senderName: 'Admin', message: 'Thank you for reporting this, Maria. We take speeding very seriously. We will investigate this incident and take appropriate action. Can you share the approximate time and location?', type: 'reply' },
    { id: 'DM3', date: '2024-05-06 07:20 AM', sender: 'commuter', senderName: 'Maria Lopez', message: 'It was around 6:30 AM, near the Meycauayan flyover heading towards Calumpit. Plate number GHI-9012.', type: 'reply' },
    { id: 'DM4', date: '2024-05-06 08:00 AM', sender: 'admin', senderName: 'Admin', message: 'We have logged this incident and issued a warning to the driver. His unit has been flagged for monitoring. We appreciate your report and commitment to safety.', type: 'reply' },
    { id: 'DM5', date: '2024-05-06 02:00 PM', sender: 'system', senderName: 'System', message: 'Incident report #IR-2024-0506 filed for driver Tikboy Saksakan (GHI-9012). Status: Under review.', type: 'notice' },
  ],
  "7": [
    { id: 'DM1', date: '2024-05-10 08:00 AM', sender: 'commuter', senderName: 'Ana Santos', message: 'I saw driver Mang Juan Tamad on plate ABC-1234 using his phone while driving this morning. This is the second time I have noticed this. When are you going to do something about it?', type: 'complaint' },
    { id: 'DM2', date: '2024-05-10 08:30 AM', sender: 'admin', senderName: 'Admin', message: 'Thank you for bringing this to our attention, Ana. We apologize for the repeated issue. This has been escalated to management for immediate disciplinary action.', type: 'reply' },
    { id: 'DM3', date: '2024-05-10 09:00 AM', sender: 'system', senderName: 'System', message: 'Second offense logged for driver Mang Juan Tamad (ABC-1234). Disciplinary hearing scheduled.', type: 'warning' },
    { id: 'DM4', date: '2024-05-10 03:00 PM', sender: 'admin', senderName: 'Admin', message: 'Update: Driver Mang Juan Tamad has been issued a written warning and required to attend a road safety seminar. His unit will be monitored for the next 30 days.', type: 'reply' },
  ],
};