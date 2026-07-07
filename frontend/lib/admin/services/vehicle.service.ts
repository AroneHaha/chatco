/**
 * Admin vehicle-management service (S5-T11).
 *
 * Calls Next.js proxy routes (which forward to Laravel with the httpOnly
 * `chatco_session` cookie) — never calls Laravel directly from the browser.
 * This keeps the Sanctum bearer token server-side only and avoids CORS.
 *
 *   GET    /api/admin/vehicles              → list(filters)
 *   GET    /api/admin/vehicles/{id}         → get(id)
 *   POST   /api/admin/vehicles              → create(input)
 *   PUT    /api/admin/vehicles/{id}         → update(id, input)
 *   DELETE /api/admin/vehicles/{id}         → remove(id)
 *
 * Responsibilities:
 *   - Map snake_case Laravel envelopes → camelCase view-models the UI uses
 *   - Translate backend 422 validation errors into typed exceptions the
 *     UI can branch on (field-level errors for the create/edit modal)
 *   - Translate the 409 Conflict (active-shift guard) into a typed
 *     `conflict` error so the delete modal can surface the specific message
 *   - Keep the page component free of API/transport concerns
 *
 * Mirrors the pattern established by lib/admin/services/user.service.ts (S5-T10)
 * and lib/commuter/services/profile.service.ts (S5-T9).
 */

// ─── Raw backend shapes ─────────────────────────────────────────────

/** A person relation (driver or conductor) as returned by the vehicle endpoint. */
interface RawPerson {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  contact?: string | null;
  vehicle_id?: string | null;
  profile_picture_url?: string | null;
}

/** A route relation as returned by the vehicle endpoint. */
interface RawRoute {
  id: string;
  name: string;
  [key: string]: unknown;
}

/** Shape of a single vehicle from AdminService (eager-loaded route/driver/conductor). */
interface RawVehicle {
  id: string;
  unit_number: string | null;
  plate_number: string | null;
  vehicle_type?: string | null;
  route_id?: string | null;
  driver_id?: string | null;
  conductor_id?: string | null;
  status: string | null;
  capacity_status?: string | null;
  route?: RawRoute | null;
  driver?: RawPerson | null;
  conductor?: RawPerson | null;
}

/**
 * Laravel LengthAwarePaginator shape (the relevant fields).
 * The full paginator also has `links`, `path`, `from`, `to` etc. —
 * we only destructure what the UI needs.
 */
interface Paginator<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

// ─── Frontend view-model ────────────────────────────────────────────

export type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE";
export type CapacityStatus = "AVAILABLE" | "FULL" | "OVERLOAD" | string;

/** A person relation in the frontend view-model. */
export interface VehiclePerson {
  id: string;
  firstName: string;
  lastName: string;
  /** Full display name ("First Last"). */
  name: string;
  contact: string | null;
}

/** A route relation in the frontend view-model. */
export interface VehicleRoute {
  id: string;
  name: string;
}

/**
 * A vehicle row in the admin fleet table.
 *
 * `id` is a UUID string (the backend uses UUID PKs). `status` is the raw
 * backend enum; `statusLabel` is the UI-friendly mapping:
 *   ACTIVE     → "Operating"
 *   MAINTENANCE → "Under Maintenance"
 *   INACTIVE   → "Out of Service / Damaged"
 */
export interface AdminVehicle {
  id: string;
  unitNumber: string;
  plateNumber: string;
  vehicleType: string | null;
  /** Raw backend status enum. */
  status: VehicleStatus;
  /** UI-friendly label for the table badge. */
  statusLabel: string;
  capacityStatus: CapacityStatus | null;
  route: VehicleRoute | null;
  driver: VehiclePerson | null;
  conductor: VehiclePerson | null;
}

/** Pagination metadata returned by the list endpoint. */
export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
  from: number | null;
  to: number | null;
}

/** Result of a list() call — the page + pagination metadata. */
export interface VehicleListResult {
  vehicles: AdminVehicle[];
  pagination: PaginationMeta;
}

// ─── Filter / input ─────────────────────────────────────────────────

export interface VehicleListFilters {
  status?: VehicleStatus | "";
  routeId?: string;
  search?: string;
  perPage?: number;
  page?: number;
}

/**
 * Fields the create/edit modal can send.
 *
 * For `create`, `unitNumber` + `plateNumber` + `routeId` are required
 * (server-enforced via StoreVehicleRequest). For `update`, only sent
 * fields are persisted (UpdateVehicleRequest uses `sometimes` validation).
 *
 * `driverId` / `conductorId` may be `null` to unassign.
 */
export interface VehicleMutationInput {
  unitNumber?: string;
  plateNumber?: string;
  vehicleType?: string | null;
  routeId?: string | null;
  driverId?: string | null;
  conductorId?: string | null;
  status?: VehicleStatus;
  capacityStatus?: CapacityStatus;
}

// ─── Typed errors ───────────────────────────────────────────────────

/**
 * Thrown by create() / update() / remove() on any non-success response.
 *
 * `code` is a stable discriminator the UI can switch on:
 *   - "validation"  → 422, `errors` map populated (plate/unit uniqueness, etc.)
 *   - "conflict"    → 409, vehicle is on an active shift (delete only);
 *                      `errors` map carries the human-readable reason
 *   - "not_found"   → 404
 *   - "forbidden"   → 403 (non-admin)
 *   - "unauthenticated" → 401 (session expired)
 *   - "network"     → 502 / unexpected
 */
export class VehicleOperationError extends Error {
  constructor(
    public code:
      | "validation"
      | "conflict"
      | "not_found"
      | "forbidden"
      | "unauthenticated"
      | "network",
    message: string,
    public field?: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "VehicleOperationError";
  }
}

// ─── Mapper ─────────────────────────────────────────────────────────

function mapStatusLabel(raw: string | null): string {
  switch (raw) {
    case "ACTIVE":
      return "Operating";
    case "MAINTENANCE":
      return "Under Maintenance";
    case "INACTIVE":
      return "Out of Service / Damaged";
    default:
      return raw ?? "—";
  }
}

function mapPerson(raw: RawPerson | null | undefined): VehiclePerson | null {
  if (!raw || !raw.id) return null;
  const firstName = raw.first_name ?? "";
  const lastName = raw.last_name ?? "";
  return {
    id: String(raw.id),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    contact: raw.contact ?? null,
  };
}

function mapRoute(raw: RawRoute | null | undefined): VehicleRoute | null {
  if (!raw || !raw.id) return null;
  return { id: String(raw.id), name: String(raw.name ?? "—") };
}

function mapVehicle(raw: RawVehicle): AdminVehicle {
  const status = (raw.status ?? "ACTIVE") as VehicleStatus;
  return {
    id: String(raw.id),
    unitNumber: String(raw.unit_number ?? ""),
    plateNumber: String(raw.plate_number ?? ""),
    vehicleType: raw.vehicle_type ?? null,
    status,
    statusLabel: mapStatusLabel(raw.status),
    capacityStatus: (raw.capacity_status as CapacityStatus | null) ?? null,
    route: mapRoute(raw.route),
    driver: mapPerson(raw.driver),
    conductor: mapPerson(raw.conductor),
  };
}

// ─── Service functions ──────────────────────────────────────────────

const API_BASE = "/api/admin/vehicles";

function buildQueryString(filters: VehicleListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.routeId) params.set("route_id", filters.routeId);
  if (filters.search && filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.perPage) params.set("per_page", String(filters.perPage));
  if (filters.page) params.set("page", String(filters.page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Map camelCase frontend input → snake_case backend contract. */
function buildMutationBody(input: VehicleMutationInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.unitNumber !== undefined) body.unit_number = input.unitNumber;
  if (input.plateNumber !== undefined) body.plate_number = input.plateNumber;
  if (input.vehicleType !== undefined) body.vehicle_type = input.vehicleType;
  if (input.routeId !== undefined) body.route_id = input.routeId;
  if (input.driverId !== undefined) body.driver_id = input.driverId;
  if (input.conductorId !== undefined) body.conductor_id = input.conductorId;
  if (input.status !== undefined) body.status = input.status;
  if (input.capacityStatus !== undefined) body.capacity_status = input.capacityStatus;
  return body;
}

/**
 * Fetch a paginated, filterable list of vehicles.
 *
 * @throws {VehicleOperationError} on 401 (unauthenticated) / 403 (forbidden) /
 *   502 (network). Never throws on empty results — returns `{ vehicles: [],
 *   pagination: {...} }`.
 */
export async function list(filters: VehicleListFilters = {}): Promise<VehicleListResult> {
  const qs = buildQueryString(filters);
  const res = await fetch(`${API_BASE}${qs}`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw translateError(res.status, await safeMessage(res));
  }

  const json = await res.json();
  // The proxy forwards the Laravel paginator as `{ data: { paginator } }`.
  // The paginator itself has a `data` array of vehicles.
  const payload: Paginator<RawVehicle> | RawVehicle[] = json.data;

  // Defensive: the endpoint always returns a paginator, but handle a
  // bare array too (older mock or future shape change).
  if (Array.isArray(payload)) {
    return {
      vehicles: payload.map(mapVehicle),
      pagination: {
        currentPage: 1,
        perPage: filters.perPage ?? payload.length,
        total: payload.length,
        lastPage: 1,
        from: payload.length ? 1 : null,
        to: payload.length,
      },
    };
  }

  return {
    vehicles: (payload.data ?? []).map(mapVehicle),
    pagination: {
      currentPage: payload.current_page,
      perPage: payload.per_page,
      total: payload.total,
      lastPage: payload.last_page,
      from: payload.from,
      to: payload.to,
    },
  };
}

/**
 * Fetch a single vehicle by ID.
 *
 * @throws {VehicleOperationError} 404 / 401 / 403 / 502
 */
export async function get(id: string): Promise<AdminVehicle> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw translateError(res.status, await safeMessage(res));
  }

  const json = await res.json();
  return mapVehicle(json.data as RawVehicle);
}

/**
 * Create a new vehicle.
 *
 * On 422 (plate/unit uniqueness violation), throws a
 * `VehicleOperationError` with `code: "validation"` and the `errors` map
 * so the create modal can render field-specific messages.
 *
 * @returns The created vehicle (fresh from the server, with relations).
 */
export async function create(input: VehicleMutationInput): Promise<AdminVehicle> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(buildMutationBody(input)),
  });

  if (!res.ok) {
    const message = await safeMessage(res);
    if (res.status === 422) {
      const errorBody = await safeJson(res);
      throw new VehicleOperationError(
        "validation",
        message,
        undefined,
        errorBody?.errors ?? undefined
      );
    }
    throw translateError(res.status, message);
  }

  const json = await res.json();
  return mapVehicle(json.data as RawVehicle);
}

/**
 * Update a vehicle's editable fields.
 *
 * On 422, throws a `VehicleOperationError` with `code: "validation"` and
 * the `errors` map so the edit modal can render field-specific messages.
 *
 * @returns The updated vehicle (fresh from the server, with relations).
 */
export async function update(id: string, input: VehicleMutationInput): Promise<AdminVehicle> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(buildMutationBody(input)),
  });

  if (!res.ok) {
    const message = await safeMessage(res);
    if (res.status === 422) {
      const errorBody = await safeJson(res);
      throw new VehicleOperationError(
        "validation",
        message,
        undefined,
        errorBody?.errors ?? undefined
      );
    }
    throw translateError(res.status, message);
  }

  const json = await res.json();
  return mapVehicle(json.data as RawVehicle);
}

/**
 * Delete a vehicle. Blocks (409) if the vehicle is currently on an active
 * shift — the conductor's active shift is never orphaned.
 *
 * @throws {VehicleOperationError} 404 / 409 (active-shift conflict) /
 *   401 / 403 / 502. On 409 the `errors` map is populated so the UI can
 *   surface the specific reason ("Cannot delete a vehicle that is
 *   currently on an active shift...").
 */
export async function remove(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const message = await safeMessage(res);
    if (res.status === 409) {
      const errorBody = await safeJson(res);
      // The proxy forwards the 409 with an `errors` map (mirror of the
      // 422 shape). Extract the first human-readable message so the
      // delete modal can show it inline.
      const errors = errorBody?.errors ?? undefined;
      const firstError = errors
        ? Object.values(errors)[0]?.[0]
        : undefined;
      throw new VehicleOperationError(
        "conflict",
        firstError ?? message ?? "Vehicle is on an active shift and cannot be deleted.",
        undefined,
        errors
      );
    }
    if (res.status === 422) {
      const errorBody = await safeJson(res);
      throw new VehicleOperationError(
        "validation",
        message,
        undefined,
        errorBody?.errors ?? undefined
      );
    }
    throw translateError(res.status, message);
  }
}

// ─── Error helpers ──────────────────────────────────────────────────

async function safeMessage(res: Response): Promise<string> {
  try {
    const body = await res.clone().json();
    return body?.message ?? `Request failed (${res.status}).`;
  } catch {
    return `Request failed (${res.status}).`;
  }
}

async function safeJson(res: Response): Promise<{ message?: string; errors?: Record<string, string[]> } | null> {
  try {
    return await res.clone().json();
  } catch {
    return null;
  }
}

function translateError(status: number, message: string): VehicleOperationError {
  switch (status) {
    case 401:
      return new VehicleOperationError("unauthenticated", "Your session has expired. Please log in again.");
    case 403:
      return new VehicleOperationError("forbidden", message || "You do not have permission to perform this action.");
    case 404:
      return new VehicleOperationError("not_found", message || "Vehicle not found.");
    case 502:
      return new VehicleOperationError("network", "Unable to reach the server. Please try again.");
    default:
      return new VehicleOperationError("network", message || "An unexpected error occurred.");
  }
}
