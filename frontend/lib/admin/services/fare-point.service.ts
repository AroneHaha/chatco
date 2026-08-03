// lib/admin/services/fare-point.service.ts
//
// Admin fare point CRUD service (S6 Settings Batch 1).
//
//   GET    /api/admin/fare-points              → list(routeId?)
//   POST   /api/admin/fare-points              → create(data)
//   PUT    /api/admin/fare-points/{id}         → update(id, data)
//   DELETE /api/admin/fare-points/{id}         → remove(id)

// ─── Types ────────────────────────────────────────────────────────────

export interface FarePoint {
  id: string;
  route_id: string;
  point_number: number;
  code: string;
  name: string;
  landmarks: string | null;
  sub_stops: string | null;
  regular_fare: number;
  discounted_fare: number;
  latitude: number | null;
  longitude: number | null;
  route?: { id: string; name: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateFarePointInput {
  route_id: string;
  point_number: number;
  code: string;
  name: string;
  // Nullable, not just optional: the edit form sends null to CLEAR an existing
  // value ("" -> null), which omitting the key would not do. Mirrors FarePoint,
  // where both fields are `string | null`.
  landmarks?: string | null;
  sub_stops?: string | null;
  regular_fare: number;
  discounted_fare: number;
  latitude?: number | null;
  longitude?: number | null;
}

export type UpdateFarePointInput = Partial<CreateFarePointInput>;

export class FarePointError extends Error {
  errors: Record<string, string[]>;
  status: number;

  constructor(message: string, errors: Record<string, string[]>, status: number) {
    super(message);
    this.name = "FarePointError";
    this.errors = errors;
    this.status = status;
  }
}

// ─── API methods ──────────────────────────────────────────────────────

/**
 * GET /api/admin/fare-points?route_id={uuid}
 * Lists all fare points, optionally filtered by route.
 */
export async function list(routeId?: string): Promise<FarePoint[]> {
  const url = routeId
    ? `/api/admin/fare-points?route_id=${encodeURIComponent(routeId)}`
    : "/api/admin/fare-points";

  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new FarePointError(
      body?.message ?? `Failed to fetch fare points (HTTP ${res.status})`,
      {},
      res.status
    );
  }

  const json = await res.json();
  return (json.data ?? []) as FarePoint[];
}

/**
 * POST /api/admin/fare-points
 */
export async function create(data: CreateFarePointInput): Promise<FarePoint> {
  const res = await fetch("/api/admin/fare-points", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new FarePointError(
      json.message ?? "Failed to create fare point.",
      json.errors ?? {},
      res.status
    );
  }

  return json.data as FarePoint;
}

/**
 * PUT /api/admin/fare-points/{id}
 */
export async function update(id: string, data: UpdateFarePointInput): Promise<FarePoint> {
  const res = await fetch(`/api/admin/fare-points/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new FarePointError(
      json.message ?? "Failed to update fare point.",
      json.errors ?? {},
      res.status
    );
  }

  return json.data as FarePoint;
}

/**
 * DELETE /api/admin/fare-points/{id}
 */
export async function remove(id: string): Promise<void> {
  const res = await fetch(`/api/admin/fare-points/${id}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new FarePointError(
      json?.message ?? "Failed to delete fare point.",
      {},
      res.status
    );
  }
}

/** Reorder every Fare Point in one route. The backend renumbers them 1..N. */
export async function reorder(routeId: string, orderedIds: string[]): Promise<FarePoint[]> {
  const res = await fetch("/api/admin/fare-points/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ route_id: routeId, ordered_ids: orderedIds }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new FarePointError(json.message ?? "Failed to reorder Fare Points.", json.errors ?? {}, res.status);
  }
  return json.data as FarePoint[];
}
