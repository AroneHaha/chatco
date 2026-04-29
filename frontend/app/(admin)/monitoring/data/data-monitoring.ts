// --- Add these to the bottom of your existing monitoring-data.ts ---

export interface LiveVehicleTracking {
  unit: string;
  driver: string;
  speed: number;
  status: "normal" | "overspeeding" | "idle";
  zone: string;
}

export const liveVehicleTracking: LiveVehicleTracking[] = [
  { unit: "XQJ 4728", driver: "Mhaku Jose Manalili", speed: 28, status: "normal", zone: "Malolos" },
  { unit: "VMY 9183", driver: "Mark Arone Dela Cruz", speed: 62, status: "overspeeding", zone: "Malolos–Meycauayan" },
  { unit: "RZP 6041", driver: "Rod Erick Dulalia", speed: 25, status: "normal", zone: "Meycauayan" },
  { unit: "LKW 3579", driver: "Marinel Carbonel", speed: 0, status: "idle", zone: "Meycauayan" },
  { unit: "TNB 8462", driver: "Nardong Putik", speed: 68, status: "overspeeding", zone: "Meycauayan–Calumpit" },
  { unit: "JHX 7905", driver: "Karding Dela Paz", speed: 30, status: "normal", zone: "Calumpit" },
  { unit: "PVR 6894", driver: "Nikola Tekla", speed: 27, status: "normal", zone: "Calumpit" },
  { unit: "QFD 2316", driver: "Alden Recharge", speed: 32, status: "normal", zone: "Malolos–Meycauayan" },
];