// Conductor unit verification domain types.
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

export type { ConductorProfile } from "@/lib/conductor/types";
