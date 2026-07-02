/**
 * Sandbox backend — SQLite-backed persistence for the dev/demo fallback.
 *
 * WHY THIS EXISTS
 * ---------------
 * arone's production architecture is Next.js (frontend/) + Laravel (backend/).
 * In the sandbox preview environment the PHP runtime is unavailable, so every
 * route that proxies to `http://localhost:8000` fails (502 / network error).
 * Each proxied route tries Laravel first and falls back to THIS module when
 * the backend is unreachable. Production deployments with a live Laravel
 * instance never touch this code path.
 *
 * PERSISTENCE
 * -----------
 * All data is stored in a real SQLite database file
 * (`frontend/.data/sandbox.sqlite`) via `better-sqlite3`. This survives server
 * restarts and hot-reloads — feedback, shifts, and vehicle assignments are
 * NOT lost when the dev server restarts (the previous in-memory `globalThis`
 * array was wiped on every restart).
 *
 * DATA MODEL
 * ----------
 * Mirrors the Laravel schema closely enough for the feedback flow + vehicle
 * assignment workflow:
 *   - users:           commuter / conductor / admin accounts (Sanctum → token)
 *   - sessions:        token → userId  (emulates Sanctum personal_access_tokens)
 *   - vehicles:        jeepney units — carries current driver_id, conductor_id,
 *                      active_shift_id (mirrors the Laravel vehicles table
 *                      columns added by the assignment refactor)
 *   - drivers:         seeded driver records (active_shift_id mirrors Laravel)
 *   - shift_logs:      append-only audit trail of every shift ever worked.
 *                      NEVER mutated after the shift ends — historical records
 *                      are preserved (matches the Laravel shift_logs table).
 *   - feedback:        commuter ratings anchored to a shift_id, stamped to BOTH
 *                      the driver's + conductor's ids (mirrors FeedbackService::submit)
 *   - remittances:     EOD remittance records (one per ended shift)
 *
 * The (commuter_id, shift_id) unique constraint is enforced at the DB level →
 * 409 on duplicate, matching the Laravel unique index.
 */

import { db, getLastDailyResetDate, setLastDailyResetDate } from "./sandbox-db";

// ─── Types (kept identical to the previous in-memory versions so the
//      proxy routes don't need any changes) ─────────────────────────────

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
  /** Current assigned driver (null when unassigned). Mirrors vehicles.driver_id. */
  driverId: string | null;
  /** Current assigned conductor (null when unassigned). Mirrors vehicles.conductor_id. */
  conductorId: string | null;
  /** Current active shift ID (null when no shift active). Mirrors vehicles.active_shift_id. */
  activeShiftId: string | null;
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

export interface InMemoryRemittance {
  id: string;
  shiftId: string;
  conductorId: string;
  driverId: string;
  vehicleId: string;
  conductorName: string;
  driverName: string;
  unitNumber: string;
  timeIn: string;
  timeOut: string;
  totalCollected: number;
  remittedAmount: number;
  shortage: number;
  cashTotal: number;
  gcashTotal: number;
  totalPassengers: number;
  remittanceStatus: string;
  createdAt: string;
}

// ─── Row shapes (snake_case from SQLite) ─────────────────────────────

interface UserRow {
  id: string; email: string; password: string; role: UserRole; name: string;
  first_name: string | null; surname: string | null; contact_number: string | null;
  commuter_type: string | null; account_status: string | null;
}

interface VehicleRow {
  id: string; unit_number: string; plate_number: string; route: string | null;
  route_id: string | null; vehicle_type: string; status: string;
  driver_id: string | null; conductor_id: string | null; active_shift_id: string | null;
  capacity_status: string | null;
}

interface DriverRow {
  id: string; name: string; first_name: string | null; last_name: string | null;
  status: string; license_number: string | null; contact_number: string | null;
  active_shift_id: string | null;
}

interface ShiftRow {
  shift_id: string; conductor_id: string; conductor_name: string;
  driver_id: string; driver_name: string; vehicle_id: string;
  unit_number: string; plate_number: string; route: string | null; route_id: string | null;
  time_in: string; time_out: string | null; is_active: number; status: string;
}

interface FeedbackRow {
  id: string; shift_id: string; vehicle_id: string; driver_id: string;
  conductor_id: string; commuter_id: string; commuter_name: string | null;
  rating: number; category: string | null; comment: string | null;
  created_at: string; updated_at: string;
}

interface RemittanceRow {
  id: string; shift_id: string; conductor_id: string; driver_id: string;
  vehicle_id: string; conductor_name: string; driver_name: string; unit_number: string;
  time_in: string; time_out: string; total_collected: number; remitted_amount: number;
  shortage: number; cash_total: number; gcash_total: number; total_passengers: number;
  remittance_status: string; created_at: string;
}

// ─── Mappers (snake_case DB row → camelCase view-model) ──────────────

function mapUser(r: UserRow): InMemoryUser {
  return {
    id: r.id,
    email: r.email,
    password: r.password,
    role: r.role,
    name: r.name,
    profile: r.first_name || r.surname
      ? {
          firstName: r.first_name ?? "",
          surname: r.surname ?? "",
          contactNumber: r.contact_number,
          commuterType: r.commuter_type ?? "REGULAR",
          accountStatus: r.account_status ?? "ACTIVE",
        }
      : null,
  };
}

function mapVehicle(r: VehicleRow): InMemoryVehicle {
  // Normalise the status to the union the frontend expects. The DB stores
  // Laravel-style "ACTIVE"/"MAINTENANCE"/"INACTIVE" but the conductor
  // unit-verification screen expects "available"/"maintenance"/"in-use".
  let status: InMemoryVehicle["status"] = "available";
  if (r.status === "MAINTENANCE" || r.status === "maintenance") status = "maintenance";
  else if (r.status === "in-use" || r.driver_id || r.active_shift_id) status = "in-use";
  return {
    id: r.id,
    unitNumber: r.unit_number,
    plateNumber: r.plate_number,
    route: r.route ?? "",
    status,
    vehicleType: r.vehicle_type,
    driverId: r.driver_id,
    conductorId: r.conductor_id,
    activeShiftId: r.active_shift_id,
  };
}

function mapDriver(r: DriverRow): InMemoryDriver {
  return {
    id: r.id,
    name: r.name,
    status: r.status as InMemoryDriver["status"],
    licenseNumber: r.license_number ?? "",
    contactNumber: r.contact_number,
  };
}

function mapShift(r: ShiftRow): InMemoryShift {
  return {
    shiftId: r.shift_id,
    conductorId: r.conductor_id,
    conductorName: r.conductor_name,
    driverId: r.driver_id,
    driverName: r.driver_name,
    vehicleId: r.vehicle_id,
    unitNumber: r.unit_number,
    plateNumber: r.plate_number,
    route: r.route ?? "",
    routeId: r.route_id,
    timeIn: r.time_in,
    timeOut: r.time_out,
    isActive: r.is_active === 1,
  };
}

function mapFeedback(r: FeedbackRow): InMemoryFeedback {
  return {
    id: r.id,
    shiftId: r.shift_id,
    vehicleId: r.vehicle_id,
    driverId: r.driver_id,
    conductorId: r.conductor_id,
    commuterId: r.commuter_id,
    commuterName: r.commuter_name ?? "Anonymous Commuter",
    rating: r.rating,
    category: r.category,
    comment: r.comment,
    createdAt: r.created_at,
  };
}

function mapRemittance(r: RemittanceRow): InMemoryRemittance {
  return {
    id: r.id,
    shiftId: r.shift_id,
    conductorId: r.conductor_id,
    driverId: r.driver_id,
    vehicleId: r.vehicle_id,
    conductorName: r.conductor_name,
    driverName: r.driver_name,
    unitNumber: r.unit_number,
    timeIn: r.time_in,
    timeOut: r.time_out,
    totalCollected: r.total_collected,
    remittedAmount: r.remitted_amount,
    shortage: r.shortage,
    cashTotal: r.cash_total,
    gcashTotal: r.gcash_total,
    totalPassengers: r.total_passengers,
    remittanceStatus: r.remittance_status,
    createdAt: r.created_at,
  };
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

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Public API: Auth ────────────────────────────────────────────────

/** Log in a user by email + password. Returns { user, token } or null. */
export function loginInMemory(email: string, password: string): {
  user: InMemoryUser;
  token: string;
} | null {
  const row = db().prepare(
    "SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND password = ?"
  ).get(email.toLowerCase(), password) as UserRow | undefined;
  if (!row) return null;

  // Revoke any existing session for this user (one token per user, like Sanctum's default).
  db().prepare("DELETE FROM sessions WHERE user_id = ?").run(row.id);
  const token = genToken();
  db().prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, row.id);
  return { user: mapUser(row), token };
}

/** Resolve a user from a bearer token. Returns null if invalid/expired. */
export function resolveSessionInMemory(token: string | undefined | null): InMemoryUser | null {
  if (!token) return null;
  const row = db().prepare(
    "SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ?"
  ).get(token) as UserRow | undefined;
  return row ? mapUser(row) : null;
}

/** Log out (revoke the token). No-op if the token doesn't exist. */
export function logoutInMemory(token: string | undefined | null): void {
  if (!token) return;
  db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// ─── Public API: Vehicles / Drivers ──────────────────────────────────

export function listUnitsInMemory(): InMemoryVehicle[] {
  // Exclude maintenance vehicles (matches the previous in-memory filter +
  // the Laravel ConductorController::units which only returns ACTIVE vehicles).
  const rows = db().prepare(
    "SELECT * FROM vehicles WHERE status NOT IN ('MAINTENANCE','maintenance','INACTIVE')"
  ).all() as VehicleRow[];
  return rows.map(mapVehicle);
}

export function listDriversInMemory(): InMemoryDriver[] {
  // Only return available drivers (matches the previous in-memory filter +
  // the Laravel ConductorController::drivers which excludes active-shift drivers).
  const rows = db().prepare(
    "SELECT * FROM drivers WHERE status = 'available' AND active_shift_id IS NULL"
  ).all() as DriverRow[];
  return rows.map(mapDriver);
}

/** List ALL vehicles (including maintenance) — used by the admin fleet view. */
export function listAllVehiclesInMemory(): InMemoryVehicle[] {
  const rows = db().prepare("SELECT * FROM vehicles ORDER BY unit_number").all() as VehicleRow[];
  return rows.map(mapVehicle);
}

/** Get a single vehicle by ID. */
export function getVehicleInMemory(id: string): InMemoryVehicle | null {
  const row = db().prepare("SELECT * FROM vehicles WHERE id = ?").get(id) as VehicleRow | undefined;
  return row ? mapVehicle(row) : null;
}

// ─── Public API: Conductor profile ───────────────────────────────────

export function getConductorProfileInMemory(userId: string): { id: string; name: string; email: string; role: string } | null {
  const row = db().prepare("SELECT * FROM users WHERE id = ? AND role = 'CONDUCTOR'").get(userId) as UserRow | undefined;
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

// ─── Public API: Shift lifecycle ─────────────────────────────────────

/**
 * Start a new shift for a conductor.
 *
 * Per the vehicle-assignment refactor, this is the ONLY place where a
 * vehicle's CURRENT driver + conductor are set:
 *   - vehicle.driver_id       → the selected driver
 *   - vehicle.conductor_id    → the logged-in conductor
 *   - vehicle.active_shift_id → the new shift
 *
 * The assignment is immediately visible across the system (admin fleet
 * table, monitoring, commuter QR scan, etc.).
 */
export function startShiftInMemory(
  conductorId: string,
  data: { vehicleId: string; driverId: string; routeId?: string | null }
): InMemoryShift {
  const database = db();

  // Run the daily-reset check BEFORE starting a shift so the new day starts
  // clean (in case the server was asleep at midnight).
  maybeRunDailyReset();

  const conductor = database.prepare("SELECT * FROM users WHERE id = ? AND role = 'CONDUCTOR'").get(conductorId) as UserRow | undefined;
  if (!conductor) throw new Error("Conductor not found.");

  // One active shift per conductor.
  const existingActive = database.prepare(
    "SELECT shift_id FROM shift_logs WHERE conductor_id = ? AND is_active = 1"
  ).get(conductorId) as { shift_id: string } | undefined;
  if (existingActive) throw new Error("An active shift already exists.");

  const vehicle = database.prepare("SELECT * FROM vehicles WHERE id = ?").get(data.vehicleId) as VehicleRow | undefined;
  if (!vehicle) throw new Error("Selected unit is no longer available.");

  const driver = database.prepare("SELECT * FROM drivers WHERE id = ?").get(data.driverId) as DriverRow | undefined;
  if (!driver) throw new Error("Selected driver is no longer available.");

  // Prevent double-booking the unit (another conductor's active shift).
  const unitBusy = database.prepare(
    "SELECT shift_id FROM shift_logs WHERE vehicle_id = ? AND is_active = 1"
  ).get(data.vehicleId) as { shift_id: string } | undefined;
  if (unitBusy) throw new Error("This unit is already on an active shift.");

  // Prevent double-booking the driver (another shift's active driver).
  const driverBusy = database.prepare(
    "SELECT shift_id FROM shift_logs WHERE driver_id = ? AND is_active = 1"
  ).get(data.driverId) as { shift_id: string } | undefined;
  if (driverBusy) throw new Error("This driver is already on an active shift.");

  const shiftId = genId("SHF");
  const now = new Date().toISOString();
  const conductorName = conductor.name;
  const driverName = driver.name;
  const routeName = vehicle.route ?? "";

  const tx = database.transaction(() => {
    // 1. Create the shift_log row (append-only — never deleted).
    database.prepare(
      `INSERT INTO shift_logs (shift_id, conductor_id, conductor_name, driver_id, driver_name, vehicle_id, unit_number, plate_number, route, route_id, time_in, time_out, is_active, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 'ACTIVE')`
    ).run(shiftId, conductorId, conductorName, data.driverId, driverName, data.vehicleId, vehicle.unit_number, vehicle.plate_number, routeName, data.routeId ?? null, now);

    // 2. Auto-assign driver + conductor to the vehicle (the refactor's core
    //    requirement — assignment happens HERE, not in the Add-Vehicle modal).
    database.prepare(
      `UPDATE vehicles SET driver_id = ?, conductor_id = ?, active_shift_id = ?, status = 'in-use' WHERE id = ?`
    ).run(data.driverId, conductorId, shiftId, data.vehicleId);

    // 3. Mark the driver as on-shift.
    database.prepare(
      `UPDATE drivers SET status = 'on-shift', active_shift_id = ? WHERE id = ?`
    ).run(shiftId, data.driverId);
  });
  tx();

  const row = database.prepare("SELECT * FROM shift_logs WHERE shift_id = ?").get(shiftId) as ShiftRow;
  return mapShift(row);
}

export function getActiveShiftInMemory(conductorId: string): InMemoryShift | null {
  const row = db().prepare(
    "SELECT * FROM shift_logs WHERE conductor_id = ? AND is_active = 1"
  ).get(conductorId) as ShiftRow | undefined;
  return row ? mapShift(row) : null;
}

/**
 * Resolve today's latest shift for a vehicle — the crew the commuter is about
 * to rate. Mirrors FeedbackService::resolveCrewForVehicle (active OR ended
 * today). Returns null when no shift exists for this vehicle today.
 */
export function resolveCrewForVehicleInMemory(vehicleId: string): InMemoryShift | null {
  const rows = db().prepare(
    "SELECT * FROM shift_logs WHERE vehicle_id = ? ORDER BY time_in DESC"
  ).all(vehicleId) as ShiftRow[];
  const todayShifts = rows.filter((s) => isToday(s.time_in));
  return todayShifts[0] ? mapShift(todayShifts[0]) : null;
}

/**
 * End a shift via remittance submission — mirrors ShiftService::endShiftViaRemittance.
 *
 * Per the vehicle-assignment refactor, this is the ONLY place where a
 * vehicle's CURRENT driver + conductor are CLEARED (after a successful EOD):
 *   - vehicle.driver_id       → NULL
 *   - vehicle.conductor_id    → NULL
 *   - vehicle.active_shift_id → NULL
 *
 * The vehicle becomes available again with no active assignment. Historical
 * records (this shift_log row, the remittance row, transactions, feedback)
 * are NEVER deleted — only the CURRENT assignment is cleared.
 */
export function endShiftViaRemittanceInMemory(
  conductorId: string,
  data: {
    shiftId: string;
    totalCollected: number;
    remittedAmount: number;
    cashTotal?: number;
    gcashTotal?: number;
    totalPassengers?: number;
  }
): InMemoryRemittance {
  const database = db();

  const shift = database.prepare("SELECT * FROM shift_logs WHERE shift_id = ?").get(data.shiftId) as ShiftRow | undefined;
  if (!shift) throw new Error("Shift not found.");
  if (shift.conductor_id !== conductorId) throw new Error("Forbidden: shift does not belong to this conductor.");
  if (shift.status !== "ACTIVE") throw new Error("Shift is not active.");

  const shortage = Math.max(0, data.totalCollected - data.remittedAmount);
  const timeOut = new Date().toISOString();
  const remittanceId = genId("REM");
  const cashTotal = data.cashTotal ?? data.totalCollected;
  const gcashTotal = data.gcashTotal ?? 0;
  const totalPassengers = data.totalPassengers ?? 0;
  const remittanceStatus = shortage > 0 ? "SHORTAGE" : "COMPLETE";

  const tx = database.transaction(() => {
    // 1. Write the remittance record (historical — never deleted).
    database.prepare(
      `INSERT INTO remittances (id, shift_id, conductor_id, driver_id, vehicle_id, conductor_name, driver_name, unit_number, time_in, time_out, total_collected, remitted_amount, shortage, cash_total, gcash_total, total_passengers, remittance_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(remittanceId, data.shiftId, shift.conductor_id, shift.driver_id, shift.vehicle_id, shift.conductor_name, shift.driver_name, shift.unit_number, shift.time_in, timeOut, data.totalCollected, data.remittedAmount, shortage, cashTotal, gcashTotal, totalPassengers, remittanceStatus, timeOut);

    // 2. Flip the shift_log to ENDED (historical row stays — only status changes).
    database.prepare(
      "UPDATE shift_logs SET status = 'ENDED', is_active = 0, time_out = ? WHERE shift_id = ?"
    ).run(timeOut, data.shiftId);

    // 3. Clear the vehicle's CURRENT active assignment (the refactor's core
    //    requirement — only the current assignment is cleared; the shift_log
    //    row + remittance row above are the permanent historical record).
    database.prepare(
      "UPDATE vehicles SET driver_id = NULL, conductor_id = NULL, active_shift_id = NULL, status = 'ACTIVE' WHERE id = ?"
    ).run(shift.vehicle_id);

    // 4. Mark the driver as available again.
    database.prepare(
      "UPDATE drivers SET status = 'available', active_shift_id = NULL WHERE id = ?"
    ).run(shift.driver_id);
  });
  tx();

  const row = database.prepare("SELECT * FROM remittances WHERE id = ?").get(remittanceId) as RemittanceRow;
  return mapRemittance(row);
}

// ─── Public API: Feedback ────────────────────────────────────────────

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
  const database = db();

  const shift = database.prepare("SELECT * FROM shift_logs WHERE shift_id = ?").get(data.shiftId) as ShiftRow | undefined;
  if (!shift) throw new FeedbackError("Shift not found", 422);

  const commuter = database.prepare("SELECT * FROM users WHERE id = ?").get(commuterId) as UserRow | undefined;
  const commuterName = commuter?.name ?? "Anonymous Commuter";

  const id = genId("FB");
  const now = new Date().toISOString();

  try {
    database.prepare(
      `INSERT INTO feedback (id, shift_id, vehicle_id, driver_id, conductor_id, commuter_id, commuter_name, rating, category, comment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, data.shiftId, shift.vehicle_id, shift.driver_id, shift.conductor_id, commuterId, commuterName, data.rating, data.category ?? null, data.comment ?? null, now, now);
  } catch (e) {
    // SQLite UNIQUE constraint violation → 409 (one feedback per commuter per shift).
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE")) {
      throw new FeedbackError("You have already submitted feedback for this shift", 409);
    }
    throw e;
  }

  const row = database.prepare("SELECT * FROM feedback WHERE id = ?").get(id) as FeedbackRow;
  return mapFeedback(row);
}

/** A commuter's own feedback history, newest first. */
export function listMyFeedbackInMemory(commuterId: string): InMemoryFeedback[] {
  const rows = db().prepare(
    "SELECT * FROM feedback WHERE commuter_id = ? ORDER BY created_at DESC"
  ).all(commuterId) as FeedbackRow[];
  return rows.map(mapFeedback);
}

/** All feedback for a shift (both driver + conductor targets). */
export function listFeedbackForShiftInMemory(shiftId: string): InMemoryFeedback[] {
  const rows = db().prepare(
    "SELECT * FROM feedback WHERE shift_id = ? ORDER BY created_at DESC"
  ).all(shiftId) as FeedbackRow[];
  return rows.map(mapFeedback);
}

/** All feedback stamped to a conductor (across all their shifts). */
export function listFeedbackForConductorInMemory(conductorId: string): InMemoryFeedback[] {
  const rows = db().prepare(
    "SELECT * FROM feedback WHERE conductor_id = ? ORDER BY created_at DESC"
  ).all(conductorId) as FeedbackRow[];
  return rows.map(mapFeedback);
}

/** All feedback stamped to a driver (across all their shifts). */
export function listFeedbackForDriverInMemory(driverId: string): InMemoryFeedback[] {
  const rows = db().prepare(
    "SELECT * FROM feedback WHERE driver_id = ? ORDER BY created_at DESC"
  ).all(driverId) as FeedbackRow[];
  return rows.map(mapFeedback);
}

// ─── Public API: Remittance history ──────────────────────────────────

/** A conductor's own remittance history, newest first. */
export function listMyRemittancesInMemory(conductorId: string): InMemoryRemittance[] {
  const rows = db().prepare(
    "SELECT * FROM remittances WHERE conductor_id = ? ORDER BY created_at DESC"
  ).all(conductorId) as RemittanceRow[];
  return rows.map(mapRemittance);
}

// ─── Public API: Daily reset ─────────────────────────────────────────

/**
 * Clear the CURRENT driver + conductor + active-shift assignment on EVERY
 * vehicle so each unit starts the new day with no active personnel.
 *
 * Data integrity: this function NEVER touches historical records. The
 * shift_logs table (append-only audit trail) and the remittances table
 * remain fully intact — only the mutable "current assignment" columns on
 * the vehicles table are reset to null. Mirrors the Laravel
 * `ResetDailyVehicleAssignments` console command.
 *
 * Returns the number of affected vehicles.
 */
export function resetDailyAssignmentsInMemory(): number {
  const database = db();
  const result = database.prepare(
    "UPDATE vehicles SET driver_id = NULL, conductor_id = NULL, active_shift_id = NULL, status = 'ACTIVE' WHERE driver_id IS NOT NULL OR conductor_id IS NOT NULL OR active_shift_id IS NOT NULL"
  ).run();

  // Also clear any drivers that are still marked on-shift (defensive — a shift
  // that never got a remittance should not strand the driver).
  database.prepare("UPDATE drivers SET status = 'available', active_shift_id = NULL WHERE status = 'on-shift'").run();

  // Mark any lingering ACTIVE shifts as ENDED (they should have been ended via
  // remittance; this is a safety net for the daily reset, NOT a deletion).
  database.prepare("UPDATE shift_logs SET status = 'ENDED', is_active = 0, time_out = COALESCE(time_out, ?) WHERE is_active = 1").run(new Date().toISOString());

  setLastDailyResetDate(todayStr());
  return result.changes;
}

/**
 * Lazily run the daily reset if a new day has started since the last reset.
 *
 * Called on every shift-start (and safe to call from anywhere) so the reset
 * always fires once per calendar day even if the server was asleep at
 * midnight. Mirrors the Laravel `Schedule::command('vehicles:reset-daily-assignments')->dailyAt('00:00')`.
 */
export function maybeRunDailyReset(): void {
  const last = getLastDailyResetDate();
  const today = todayStr();
  if (last !== today) {
    resetDailyAssignmentsInMemory();
  }
}

// ─── Error type (carries an HTTP status) ─────────────────────────────

export class FeedbackError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "FeedbackError";
  }
}
