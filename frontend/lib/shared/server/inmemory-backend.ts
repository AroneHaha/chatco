/**
 * In-memory backend — DEV/DEMO fallback when the Laravel API is unreachable.
 *
 * WHY THIS EXISTS
 * --------------
 * arone's production architecture is Next.js (frontend/) + Laravel (backend/).
 * In the sandbox preview environment the PHP runtime is unavailable, so every
 * route that proxies to `http://localhost:8000` fails (502 / network error).
 * To keep the full commuter → conductor feedback loop demoable end-to-end,
 * each proxied route tries Laravel first and falls back to this in-memory
 * store when the backend is unreachable. Production deployments with a live
 * Laravel instance never touch this code path.
 *
 * The store is a module-level singleton hoisted onto `globalThis` so it
 * survives Next.js dev hot-reloads (a plain module variable would be
 * re-initialized on every reload, wiping shifts + feedback mid-session).
 *
 * DATA MODEL
 * ----------
 * Mirrors the Laravel schema closely enough for the feedback flow:
 *   - users:           commuter / conductor / admin accounts ( Sanctum → token)
 *   - sessions:        token → userId  (emulates Sanctum personal_access_tokens)
 *   - vehicles:        seeded jeepney units (the permanent unit-QR target)
 *   - drivers:         seeded driver records
 *   - shifts:          created when a conductor starts a shift (carries
 *                      driver_id + conductor_id + vehicle_id — the crew snapshot)
 *   - feedback:        commuter ratings anchored to a shift_id, stamped to BOTH
 *                      the driver's + conductor's ids (mirrors FeedbackService::submit)
 *
 * The (commuter_id, shift_id) unique constraint is enforced in code → 409 on
 * duplicate, matching the Laravel unique index.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "CONDUCTOR" | "COMMUTER";

export interface InMemoryUser {
  id: string;
  email: string;
  password: string; // plaintext — DEV/DEMO ONLY, never reaches production
  role: UserRole;
  name: string;
  profile: {
    firstName: string;
    surname: string;
    contactNumber: string | null;
    commuterType: string;
    accountStatus: string;
  } | null;
}

export interface InMemoryVehicle {
  id: string;
  unitNumber: string;
  plateNumber: string;
  route: string;
  status: "available" | "maintenance" | "in-use";
  vehicleType: string;
}

export interface InMemoryDriver {
  id: string;
  name: string;
  status: "available" | "on-shift";
  licenseNumber: string;
  contactNumber: string | null;
}

export interface InMemoryShift {
  shiftId: string;
  conductorId: string;
  conductorName: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  unitNumber: string;
  plateNumber: string;
  route: string;
  routeId: string | null;
  timeIn: string;
  timeOut: string | null;
  isActive: boolean;
}

export interface InMemoryFeedback {
  id: string;
  shiftId: string;
  vehicleId: string;
  driverId: string;
  conductorId: string;
  commuterId: string;
  commuterName: string;
  rating: number;
  category: string | null;
  comment: string | null;
  createdAt: string;
}

interface InMemoryStore {
  users: InMemoryUser[];
  sessions: Map<string, string>; // token → userId
  vehicles: InMemoryVehicle[];
  drivers: InMemoryDriver[];
  shifts: InMemoryShift[];
  feedback: InMemoryFeedback[];
}

// ─── Singleton (survives hot-reload) ─────────────────────────────────

const STORE_KEY = "__chatco_inmemory_backend__";

function getStore(): InMemoryStore {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: InMemoryStore };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = {
      users: [
        {
          id: "cond-1",
          email: "conductor@chatco.ph",
          password: "conductor123",
          role: "CONDUCTOR",
          name: "Pedro Penduko",
          profile: null,
        },
        {
          id: "comm-1",
          email: "commuter@chatco.ph",
          password: "commuter123",
          role: "COMMUTER",
          name: "Maria Santos",
          profile: {
            firstName: "Maria",
            surname: "Santos",
            contactNumber: "09171234567",
            commuterType: "REGULAR",
            accountStatus: "ACTIVE",
          },
        },
        {
          id: "adm-1",
          email: "admin@chatco.ph",
          password: "admin123",
          role: "ADMIN",
          name: "Admin User",
          profile: null,
        },
      ],
      sessions: new Map(),
      vehicles: [
        {
          id: "unit-1",
          unitNumber: "DEF-5678",
          plateNumber: "DEF-5678",
          route: "Meycauayan–Calumpit",
          status: "available",
          vehicleType: "Jeepney",
        },
        {
          id: "unit-4",
          unitNumber: "ABC-1234",
          plateNumber: "ABC-1234",
          route: "Meycauayan–Calumpit",
          status: "available",
          vehicleType: "Jeepney",
        },
        {
          id: "unit-2",
          unitNumber: "GHI-9012",
          plateNumber: "GHI-9012",
          route: "Meycauayan–Calumpit",
          status: "maintenance",
          vehicleType: "Jeepney",
        },
      ],
      drivers: [
        { id: "drv-1", name: "Boy Pick-Up Dela Cruz", status: "available", licenseNumber: "LIC-001", contactNumber: "09170000001" },
        { id: "drv-3", name: "Tikboy Saksakan", status: "available", licenseNumber: "LIC-003", contactNumber: "09170000003" },
        { id: "drv-5", name: "Dodong Bullet", status: "available", licenseNumber: "LIC-005", contactNumber: "09170000005" },
        { id: "drv-7", name: "Mang Juan Tamad", status: "available", licenseNumber: "LIC-007", contactNumber: "09170000007" },
      ],
      shifts: [],
      feedback: [],
    };
  }
  return g[STORE_KEY]!;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000).toString(36).toUpperCase()}`;
}

function genToken(): string {
  return `${Math.floor(Math.random() * 100)}|${genId("tok")}`;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ─── Public API ──────────────────────────────────────────────────────

/** Log in a user by email + password. Returns { user, token } or null. */
export function loginInMemory(email: string, password: string): {
  user: InMemoryUser;
  token: string;
} | null {
  const store = getStore();
  const user = store.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) return null;

  // Revoke any existing session for this user (one token per user, like Sanctum's default).
  for (const [tok, uid] of store.sessions) {
    if (uid === user.id) store.sessions.delete(tok);
  }
  const token = genToken();
  store.sessions.set(token, user.id);
  return { user, token };
}

/** Resolve a user from a bearer token. Returns null if invalid/expired. */
export function resolveSessionInMemory(token: string | undefined | null): InMemoryUser | null {
  if (!token) return null;
  const store = getStore();
  const userId = store.sessions.get(token);
  if (!userId) return null;
  return store.users.find((u) => u.id === userId) ?? null;
}

/** Log out (revoke the token). No-op if the token doesn't exist. */
export function logoutInMemory(token: string | undefined | null): void {
  if (!token) return;
  getStore().sessions.delete(token);
}

// ─── Vehicles / Drivers (conductor unit-verification) ────────────────

export function listUnitsInMemory(): InMemoryVehicle[] {
  return getStore()
    .vehicles.filter((v) => v.status !== "maintenance")
    .map((v) => ({ ...v }));
}

export function listDriversInMemory(): InMemoryDriver[] {
  return getStore()
    .drivers.filter((d) => d.status === "available")
    .map((d) => ({ ...d }));
}

// ─── Conductor profile ───────────────────────────────────────────────

export function getConductorProfileInMemory(userId: string): { id: string; name: string; email: string; role: string } | null {
  const user = getStore().users.find((u) => u.id === userId);
  if (!user || user.role !== "CONDUCTOR") return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// ─── Shift lifecycle ─────────────────────────────────────────────────

export function startShiftInMemory(
  conductorId: string,
  data: { vehicleId: string; driverId: string; routeId?: string | null }
): InMemoryShift {
  const store = getStore();
  const conductor = store.users.find((u) => u.id === conductorId);
  if (!conductor) throw new Error("Conductor not found.");

  // One active shift per conductor.
  const existing = store.shifts.find(
    (s) => s.conductorId === conductorId && s.isActive
  );
  if (existing) throw new Error("An active shift already exists.");

  const vehicle = store.vehicles.find((v) => v.id === data.vehicleId);
  if (!vehicle) throw new Error("Selected unit is no longer available.");

  const driver = store.drivers.find((d) => d.id === data.driverId);
  if (!driver) throw new Error("Selected driver is no longer available.");

  // Prevent double-booking the unit (another conductor's active shift).
  const unitBusy = store.shifts.some(
    (s) => s.vehicleId === data.vehicleId && s.isActive
  );
  if (unitBusy) throw new Error("This unit is already on an active shift.");

  const shift: InMemoryShift = {
    shiftId: genId("SHF"),
    conductorId: conductor.id,
    conductorName: conductor.name,
    driverId: driver.id,
    driverName: driver.name,
    vehicleId: vehicle.id,
    unitNumber: vehicle.unitNumber,
    plateNumber: vehicle.plateNumber,
    route: vehicle.route,
    routeId: data.routeId ?? null,
    timeIn: new Date().toISOString(),
    timeOut: null,
    isActive: true,
  };
  store.shifts.push(shift);
  vehicle.status = "in-use";
  driver.status = "on-shift";
  return shift;
}

export function getActiveShiftInMemory(conductorId: string): InMemoryShift | null {
  const store = getStore();
  return (
    store.shifts.find((s) => s.conductorId === conductorId && s.isActive) ?? null
  );
}

/**
 * Resolve today's latest shift for a vehicle — the crew the commuter is about
 * to rate. Mirrors FeedbackService::resolveCrewForVehicle (active OR ended
 * today). Returns null when no shift exists for this vehicle today.
 */
export function resolveCrewForVehicleInMemory(vehicleId: string): InMemoryShift | null {
  const store = getStore();
  const todayShifts = store.shifts
    .filter((s) => s.vehicleId === vehicleId && isToday(s.timeIn))
    .sort((a, b) => +new Date(b.timeIn) - +new Date(a.timeIn));
  return todayShifts[0] ?? null;
}

// ─── Feedback ────────────────────────────────────────────────────────

/**
 * Persist a commuter's feedback for a shift. The driver_id + conductor_id +
 * vehicle_id are derived from the shift (never trusted from the client),
 * matching FeedbackService::submit. Throws on duplicate (409) or unknown
 * shift (422).
 */
export function submitFeedbackInMemory(
  commuterId: string,
  data: { shiftId: string; rating: number; comment?: string; category?: string }
): InMemoryFeedback {
  const store = getStore();
  const shift = store.shifts.find((s) => s.shiftId === data.shiftId);
  if (!shift) throw new FeedbackError("Shift not found", 422);

  // One feedback per commuter per shift.
  const dup = store.feedback.find(
    (f) => f.shiftId === data.shiftId && f.commuterId === commuterId
  );
  if (dup) {
    throw new FeedbackError("You have already submitted feedback for this shift", 409);
  }

  const commuter = store.users.find((u) => u.id === commuterId);
  const feedback: InMemoryFeedback = {
    id: genId("FB"),
    shiftId: shift.shiftId,
    vehicleId: shift.vehicleId,
    driverId: shift.driverId,
    conductorId: shift.conductorId,
    commuterId,
    commuterName: commuter?.name ?? "Anonymous Commuter",
    rating: data.rating,
    category: data.category ?? null,
    comment: data.comment ?? null,
    createdAt: new Date().toISOString(),
  };
  store.feedback.push(feedback);
  return feedback;
}

/** A commuter's own feedback history, newest first. */
export function listMyFeedbackInMemory(commuterId: string): InMemoryFeedback[] {
  return getStore()
    .feedback.filter((f) => f.commuterId === commuterId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** All feedback for a shift (both driver + conductor targets). */
export function listFeedbackForShiftInMemory(shiftId: string): InMemoryFeedback[] {
  return getStore()
    .feedback.filter((f) => f.shiftId === shiftId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** All feedback stamped to a conductor (across all their shifts). */
export function listFeedbackForConductorInMemory(conductorId: string): InMemoryFeedback[] {
  return getStore()
    .feedback.filter((f) => f.conductorId === conductorId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

/** All feedback stamped to a driver (across all their shifts). */
export function listFeedbackForDriverInMemory(driverId: string): InMemoryFeedback[] {
  return getStore()
    .feedback.filter((f) => f.driverId === driverId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

// ─── Error type (carries an HTTP status) ─────────────────────────────

export class FeedbackError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "FeedbackError";
  }
}
