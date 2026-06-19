export type AsyncStatus = "idle" | "loading" | "success" | "error" | "empty";

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T;
  error: string | null;
}

export function loadingState<T>(fallback: T): AsyncState<T> {
  return { status: "loading", data: fallback, error: null };
}

export function successState<T>(data: T): AsyncState<T> {
  return { status: "success", data, error: null };
}

export function errorState<T>(fallback: T, error: string): AsyncState<T> {
  return { status: "error", data: fallback, error };
}

export function emptyState<T>(fallback: T): AsyncState<T> {
  return { status: "empty", data: fallback, error: null };
}

export interface ConductorProfile {
  id: string;
  name: string;
}

export interface ConductorUnit {
  id: string;
  unitNumber: string;
  plateNumber: string;
  route: string;
  routeId?: string;
  status: "available" | "in-use" | "maintenance";
}

export interface ConductorDriver {
  id: string;
  name: string;
  status: "available" | "on-shift";
}

export interface ConductorHailRequest {
  id: string;
  commuterName: string;
  latitude: number;
  longitude: number;
  label?: string;
  etaMinutes?: number;
}
