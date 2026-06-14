// src/lib/conductor/server/seed.ts
// Seed data for the conductor system.

import type { ConductorHailRequest } from "../types";
import type { ConductorRating } from "../services/ratings.service";

export interface SeedUnit {
  unitNumber: string;
  plateNumber: string;
  route: string;
  type: "bus" | "jeepney" | "uv-express";
  capacity: number;
}

export interface SeedDriver {
  driverId: string;
  name: string;
  licenseNumber: string;
  unitNumber: string;
}

export const SEED_UNITS: SeedUnit[] = [
  { unitNumber: "BUS-001", plateNumber: "ABC-1234", route: "Route 1 — Cubao ↔ Ayala", type: "bus", capacity: 50 },
  { unitNumber: "BUS-002", plateNumber: "DEF-5678", route: "Route 2 — Quiapo ↔ Makati", type: "bus", capacity: 50 },
  { unitNumber: "JEEP-001", plateNumber: "GHI-9012", route: "Route 3 — Pasig ↔ Ortigas", type: "jeepney", capacity: 20 },
  { unitNumber: "JEEP-002", plateNumber: "JKL-3456", route: "Route 4 — Kalayaan ↔ C5", type: "jeepney", capacity: 20 },
  { unitNumber: "UV-001", plateNumber: "MNO-7890", route: "Route 5 — Alabang ↔ Sucat", type: "uv-express", capacity: 12 },
];

export const SEED_DRIVERS: SeedDriver[] = [
  { driverId: "DRV-001", name: "Ricardo Dalisay", licenseNumber: "LIC-2024-001", unitNumber: "BUS-001" },
  { driverId: "DRV-002", name: "Antonio Trillanes", licenseNumber: "LIC-2024-002", unitNumber: "BUS-002" },
  { driverId: "DRV-003", name: "Manny Pacquiao", licenseNumber: "LIC-2024-003", unitNumber: "JEEP-001" },
  { driverId: "DRV-004", name: "Raffy Tulfo", licenseNumber: "LIC-2024-004", unitNumber: "JEEP-002" },
  { driverId: "DRV-005", name: "Lito Lapid", licenseNumber: "LIC-2024-005", unitNumber: "UV-001" },
];

export const SEED_HAILS: ConductorHailRequest[] = [
  { hailId: "HAIL-001", commuterName: "Maria Santos", pickup: "Cubao Station", dropoff: "Ayala Terminal", status: "pending", timestamp: Date.now() - 300000 },
  { hailId: "HAIL-002", commuterName: "Juan Cruz", pickup: "Ortigas Center", dropoff: "SM Megamall", status: "pending", timestamp: Date.now() - 180000 },
  { hailId: "HAIL-003", commuterName: "Ana Reyes", pickup: "Pasig Market", dropoff: "Robinsons Galleria", status: "accepted", timestamp: Date.now() - 120000 },
];

export function buildSeedRatings(shiftId: string): ConductorRating[] {
  const names = ["Pedro Garcia", "Lisa Mendoza", "Carlos Rivera", "Sofia Torres", "Diego Villanueva"];
  const comments = [
    "Very helpful conductor!",
    "Smooth ride, thanks!",
    "Could be more attentive.",
    "Great service today.",
    "Friendly and professional.",
  ];
  return names.map((name, i) => ({
    ratingId: `RATE-${shiftId}-${i + 1}`,
    shiftId,
    commuterName: name,
    stars: 3 + Math.floor(Math.random() * 3), // 3-5 stars
    comment: comments[i],
    timestamp: Date.now() - (5 - i) * 3600000,
  }));
}
