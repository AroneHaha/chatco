// src/lib/conductor/types.ts

export interface ConductorHailRequest {
  hailId: string;
  commuterName: string;
  pickup: string;
  dropoff: string;
  status: "pending" | "accepted" | "declined" | "completed";
  timestamp: number;
}

export type TransactionType = "fare" | "cargo" | "special";
export type HailStatus = ConductorHailRequest["status"];
