/**
 * Sandbox SQLite database — REAL persistence for the dev/demo fallback.
 *
 * WHY THIS EXISTS
 * ---------------
 * arone's production architecture is Next.js (frontend/) + Laravel (backend/).
 * In the sandbox preview environment the PHP runtime is unavailable, so every
 * route that proxies to `http://localhost:8000` fails (502 / network error).
 * The previous fallback used a `globalThis` in-memory array — feedback and
 * shifts were lost on every server restart.
 *
 * This module replaces that in-memory array with a REAL SQLite database file
 * at `frontend/.data/sandbox.sqlite`. It mirrors the Laravel schema closely
 * enough for the commuter → conductor feedback loop + vehicle assignment
 * workflow to work end-to-end with genuine persistence:
 *
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
 *   - meta:            key/value table for the daily-reset watermark
 *
 * The (commuter_id, shift_id) unique constraint is enforced at the DB level →
 * 409 on duplicate, matching the Laravel unique index.
 *
 * PRODUCTION NOTE: Production deployments with a live Laravel instance never
 * touch this code path — the proxy routes always succeed against Laravel and
 * the SQLite fallback is never reached.
 */

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// ─── Singleton (survives hot-reload) ─────────────────────────────────

const DB_KEY = "__chatco_sandbox_db__";

function getDbPath(): string {
  // Place the SQLite file inside frontend/.data/ so it lives next to the app
  // and is gitignored. The Next.js dev server runs with CWD = frontend/, so
  // process.cwd() resolves to the frontend root. We use a globalThis cache for
  // the resolved path so it's stable across hot-reloads (which can re-import
  // this module with a different CWD in edge cases).
  const g = globalThis as typeof globalThis & { __chatco_sandbox_db_path__?: string };
  if (g.__chatco_sandbox_db_path__) return g.__chatco_sandbox_db_path__;
  const path = join(process.cwd(), ".data", "sandbox.sqlite");
  g.__chatco_sandbox_db_path__ = path;
  return path;
}

function getDb(): Database.Database {
  const g = globalThis as typeof globalThis & { [DB_KEY]?: Database.Database };
  if (g[DB_KEY]) return g[DB_KEY]!;

  const dbPath = getDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL"); // better concurrency for dev hot-reloads
  db.pragma("foreign_keys = ON");

  initSchema(db);
  seedDefaults(db);

  g[DB_KEY] = db;
  return db;
}

// ─── Schema ──────────────────────────────────────────────────────────

function initSchema(db: Database.Database): void {
  // users — commuter / conductor / admin accounts
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL CHECK (role IN ('ADMIN','CONDUCTOR','COMMUTER')),
      name       TEXT NOT NULL,
      first_name TEXT,
      surname    TEXT,
      contact_number TEXT,
      commuter_type   TEXT,
      account_status TEXT
    );
  `);

  // sessions — token → userId (emulates Sanctum personal_access_tokens)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token   TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // vehicles — jeepney units. Mirrors the Laravel vehicles table including the
  // current-assignment columns (driver_id, conductor_id, active_shift_id) added
  // by the vehicle-assignment workflow refactor.
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id               TEXT PRIMARY KEY,
      unit_number      TEXT NOT NULL UNIQUE,
      plate_number     TEXT NOT NULL UNIQUE,
      route            TEXT,
      route_id         TEXT,
      vehicle_type     TEXT DEFAULT 'Jeepney',
      status           TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','MAINTENANCE','INACTIVE','available','maintenance','in-use')),
      driver_id        TEXT,
      conductor_id     TEXT,
      active_shift_id  TEXT,
      capacity_status  TEXT,
      latitude         REAL,
      longitude        REAL,
      last_location_update TEXT
    );
  `);

  // drivers — seeded driver records. active_shift_id mirrors the Laravel
  // drivers table (set when a shift starts, cleared when it ends).
  db.exec(`
    CREATE TABLE IF NOT EXISTS drivers (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      first_name       TEXT,
      last_name        TEXT,
      status           TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','on-shift')),
      license_number   TEXT,
      contact_number   TEXT,
      active_shift_id  TEXT
    );
  `);

  // shift_logs — append-only audit trail of every shift ever worked.
  // NEVER mutated after the shift ends (time_out + is_active flips are the only
  // updates). Historical records are preserved forever, matching the Laravel
  // shift_logs table semantics.
  db.exec(`
    CREATE TABLE IF NOT EXISTS shift_logs (
      shift_id        TEXT PRIMARY KEY,
      conductor_id    TEXT NOT NULL REFERENCES users(id),
      conductor_name  TEXT NOT NULL,
      driver_id       TEXT NOT NULL REFERENCES drivers(id),
      driver_name     TEXT NOT NULL,
      vehicle_id      TEXT NOT NULL REFERENCES vehicles(id),
      unit_number     TEXT NOT NULL,
      plate_number    TEXT NOT NULL,
      route           TEXT,
      route_id        TEXT,
      time_in         TEXT NOT NULL,
      time_out        TEXT,
      is_active       INTEGER NOT NULL DEFAULT 1,
      status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ENDED'))
    );
  `);

  // feedback — commuter ratings anchored to a shift_id, stamped to BOTH the
  // driver's + conductor's ids. Mirrors the Laravel `feedback` table.
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id           TEXT PRIMARY KEY,
      shift_id     TEXT NOT NULL REFERENCES shift_logs(shift_id),
      vehicle_id   TEXT NOT NULL REFERENCES vehicles(id),
      driver_id    TEXT NOT NULL REFERENCES drivers(id),
      conductor_id TEXT NOT NULL REFERENCES users(id),
      commuter_id  TEXT NOT NULL REFERENCES users(id),
      commuter_name TEXT,
      rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      category     TEXT,
      comment      TEXT,
      conductor_rating   INTEGER CHECK (conductor_rating BETWEEN 1 AND 5),
      conductor_category TEXT,
      conductor_comment  TEXT,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      UNIQUE (commuter_id, shift_id)
    );
  `);

  // remittances — EOD remittance records (one per ended shift).
  db.exec(`
    CREATE TABLE IF NOT EXISTS remittances (
      id                TEXT PRIMARY KEY,
      shift_id          TEXT NOT NULL UNIQUE REFERENCES shift_logs(shift_id),
      conductor_id      TEXT NOT NULL REFERENCES users(id),
      driver_id         TEXT NOT NULL REFERENCES drivers(id),
      vehicle_id        TEXT NOT NULL REFERENCES vehicles(id),
      conductor_name    TEXT NOT NULL,
      driver_name       TEXT NOT NULL,
      unit_number       TEXT NOT NULL,
      time_in           TEXT NOT NULL,
      time_out          TEXT NOT NULL,
      total_collected   REAL NOT NULL DEFAULT 0,
      remitted_amount   REAL NOT NULL DEFAULT 0,
      shortage          REAL NOT NULL DEFAULT 0,
      cash_total        REAL NOT NULL DEFAULT 0,
      gcash_total       REAL NOT NULL DEFAULT 0,
      total_passengers  INTEGER NOT NULL DEFAULT 0,
      remittance_status TEXT NOT NULL DEFAULT 'COMPLETE',
      created_at        TEXT NOT NULL
    );
  `);

  // meta — key/value table for the daily-reset watermark + other bookkeeping.
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ─── Seeding ─────────────────────────────────────────────────────────

function seedDefaults(db: Database.Database): void {
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (userCount.c > 0) return; // already seeded

  // ── Users ──
  const insertUser = db.prepare(
    `INSERT INTO users (id, email, password, role, name, first_name, surname, contact_number, commuter_type, account_status) VALUES (@id, @email, @password, @role, @name, @first_name, @surname, @contact_number, @commuter_type, @account_status)`
  );
  insertUser.run({ id: "cond-1", email: "conductor@chatco.ph", password: "conductor123", role: "CONDUCTOR", name: "Pedro Penduko", first_name: "Pedro", surname: "Penduko", contact_number: "09170000010", commuter_type: null, account_status: null });
  insertUser.run({ id: "comm-1", email: "commuter@chatco.ph", password: "commuter123", role: "COMMUTER", name: "Maria Santos", first_name: "Maria", surname: "Santos", contact_number: "09171234567", commuter_type: "REGULAR", account_status: "ACTIVE" });
  insertUser.run({ id: "adm-1", email: "admin@chatco.ph", password: "admin123", role: "ADMIN", name: "Admin User", first_name: "Admin", surname: "User", contact_number: "09170000000", commuter_type: null, account_status: null });

  // ── Vehicles (start UNASSIGNED — per the vehicle-assignment refactor) ──
  const insertVehicle = db.prepare(
    `INSERT INTO vehicles (id, unit_number, plate_number, route, route_id, vehicle_type, status, driver_id, conductor_id, active_shift_id, capacity_status) VALUES (@id, @unit_number, @plate_number, @route, @route_id, @vehicle_type, @status, @driver_id, @conductor_id, @active_shift_id, @capacity_status)`
  );
  insertVehicle.run({ id: "unit-1", unit_number: "DEF-5678", plate_number: "DEF-5678", route: "Meycauayan–Calumpit", route_id: null, vehicle_type: "Jeepney", status: "ACTIVE", driver_id: null, conductor_id: null, active_shift_id: null, capacity_status: "AVAILABLE" });
  insertVehicle.run({ id: "unit-4", unit_number: "ABC-1234", plate_number: "ABC-1234", route: "Meycauayan–Calumpit", route_id: null, vehicle_type: "Jeepney", status: "ACTIVE", driver_id: null, conductor_id: null, active_shift_id: null, capacity_status: "AVAILABLE" });
  insertVehicle.run({ id: "unit-2", unit_number: "GHI-9012", plate_number: "GHI-9012", route: "Meycauayan–Calumpit", route_id: null, vehicle_type: "Jeepney", status: "MAINTENANCE", driver_id: null, conductor_id: null, active_shift_id: null, capacity_status: "AVAILABLE" });

  // ── Drivers ──
  const insertDriver = db.prepare(
    `INSERT INTO drivers (id, name, first_name, last_name, status, license_number, contact_number, active_shift_id) VALUES (@id, @name, @first_name, @last_name, @status, @license_number, @contact_number, @active_shift_id)`
  );
  insertDriver.run({ id: "drv-1", name: "Boy Pick-Up Dela Cruz", first_name: "Boy Pick-Up", last_name: "Dela Cruz", status: "available", license_number: "LIC-001", contact_number: "09170000001", active_shift_id: null });
  insertDriver.run({ id: "drv-3", name: "Tikboy Saksakan", first_name: "Tikboy", last_name: "Saksakan", status: "available", license_number: "LIC-003", contact_number: "09170000003", active_shift_id: null });
  insertDriver.run({ id: "drv-5", name: "Dodong Bullet", first_name: "Dodong", last_name: "Bullet", status: "available", license_number: "LIC-005", contact_number: "09170000005", active_shift_id: null });
  insertDriver.run({ id: "drv-7", name: "Mang Juan Tamad", first_name: "Mang Juan", last_name: "Tamad", status: "available", license_number: "LIC-007", contact_number: "09170000007", active_shift_id: null });
}

// ─── Public accessor ─────────────────────────────────────────────────

/** Get the singleton SQLite database handle (creates + migrates on first call). */
export function db(): Database.Database {
  return getDb();
}

// ─── Daily-reset watermark ───────────────────────────────────────────

/**
 * The meta key storing the date (YYYY-MM-DD) of the last daily-assignment
 * reset. Used by `maybeRunDailyReset()` to detect that a new day has started
 * since the last reset.
 */
export const DAILY_RESET_META_KEY = "last_daily_assignment_reset";

/** Get the stored last-reset date, or null if the reset has never run. */
export function getLastDailyResetDate(): string | null {
  const row = db().prepare("SELECT value FROM meta WHERE key = ?").get(DAILY_RESET_META_KEY) as { value: string } | undefined;
  return row?.value ?? null;
}

/** Record that the daily reset ran on the given date (YYYY-MM-DD). */
export function setLastDailyResetDate(dateStr: string): void {
  db().prepare(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(DAILY_RESET_META_KEY, dateStr);
}
