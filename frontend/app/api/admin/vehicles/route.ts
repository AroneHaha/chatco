import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import {
  resolveSessionInMemory,
  listAllVehiclesInMemory,
} from "@/lib/shared/server/inmemory-backend";
import { db } from "@/lib/shared/server/sandbox-db";

interface VehicleRow {
  id: string; unit_number: string; plate_number: string; route: string | null;
  route_id: string | null; vehicle_type: string; status: string;
  driver_id: string | null; conductor_id: string | null; active_shift_id: string | null;
  capacity_status: string | null;
}

/**
 * GET /api/admin/vehicles
 * POST /api/admin/vehicles
 *
 * PRIMARY: proxies to Laravel. FALLBACK: reads/writes the SQLite sandbox
 * store when Laravel is unreachable, so the admin fleet management page
 * keeps working (and persists) in the sandbox preview.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/admin/vehicles", { method: "GET" });
  if (result.ok) return jsonData(result.data);

  // Laravel rejected with a real error (not a network failure) — surface it.
  if (result.status !== 502) {
    return jsonError(result.message ?? "Failed to load vehicles.", result.status);
  }

  // ─── SQLite fallback ────────────────────────────────────────────────
  const token = request.cookies.get("chatco_session")?.value;
  const admin = resolveSessionInMemory(token);
  if (!admin || admin.role !== "ADMIN") {
    return jsonError("Unauthorized. Admin session required.", 401);
  }

  const vehicles = listAllVehiclesInMemory();

  // Resolve the CURRENT assigned driver + conductor names so the admin fleet
  // table can display who's on each unit. The frontend builds the display name
  // from `driver.first_name` + `driver.last_name`, so we return the full name
  // in first_name (last_name empty) — this matches how the Laravel eager-loaded
  // relationship is consumed. Assignment is set by startShiftInMemory and
  // cleared on EOD / daily reset, so this reflects the live assignment.
  const driverName = (id: string | null): string | null => {
    if (!id) return null;
    const r = db().prepare("SELECT name FROM drivers WHERE id = ?").get(id) as { name: string } | undefined;
    return r?.name ?? null;
  };
  const conductorName = (id: string | null): string | null => {
    if (!id) return null;
    const r = db().prepare("SELECT name FROM users WHERE id = ?").get(id) as { name: string } | undefined;
    return r?.name ?? null;
  };

  // Shape to match the Laravel AdminVehicleController::index response so the
  // admin vehicle-table component renders identically. Include the current
  // driver + conductor assignment so the admin can see who's on each unit.
  return jsonData({
    data: vehicles.map((v) => {
      const dName = driverName(v.driverId);
      const cName = conductorName(v.conductorId);
      return {
        id: v.id,
        unit_number: v.unitNumber,
        plate_number: v.plateNumber,
        vehicle_type: v.vehicleType,
        route: v.route,
        route_id: null,
        status: v.status === "in-use" ? "ACTIVE" : v.status.toUpperCase(),
        capacity_status: "AVAILABLE",
        driver_id: v.driverId,
        conductor_id: v.conductorId,
        active_shift_id: v.activeShiftId,
        driver: dName ? { first_name: dName, last_name: "" } : null,
        conductor: cName ? { first_name: cName, last_name: "" } : null,
        route_obj: null,
      };
    }),
    meta: {
      current_page: 1,
      per_page: vehicles.length,
      total: vehicles.length,
      last_page: 1,
      from: vehicles.length > 0 ? 1 : null,
      to: vehicles.length > 0 ? vehicles.length : null,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, "/admin/vehicles", {
    method: "POST",
    body,
  });

  if (result.ok) {
    return jsonData(result.data, 201);
  }

  // Laravel rejected with a real error (not a network failure) — surface it.
  if (result.status !== 502) {
    if (result.status === 422) {
      return jsonValidationError(
        result.message ?? "Validation failed.",
        result.errors,
        422
      );
    }
    return jsonError(result.message ?? "Failed to create vehicle.", result.status);
  }

  // ─── SQLite fallback ────────────────────────────────────────────────
  const token = request.cookies.get("chatco_session")?.value;
  const admin = resolveSessionInMemory(token);
  if (!admin || admin.role !== "ADMIN") {
    return jsonError("Unauthorized. Admin session required.", 401);
  }

  // Validate (mirror StoreVehicleRequest rules).
  const unitNumber = String(body.unit_number ?? "").trim();
  const plateNumber = String(body.plate_number ?? "").trim();
  const status = String(body.status ?? "ACTIVE").trim();
  const route = String(body.route ?? "Meycauayan–Calumpit").trim();
  const vehicleType = String(body.vehicle_type ?? "Jeepney").trim();

  const errors: Record<string, string[]> = {};
  if (!unitNumber) errors.unit_number = ["The unit number field is required."];
  if (!plateNumber) errors.plate_number = ["The plate number field is required."];
  if (!["ACTIVE", "MAINTENANCE", "INACTIVE"].includes(status)) {
    errors.status = ["The status must be one of: ACTIVE, MAINTENANCE, INACTIVE."];
  }

  // Uniqueness checks.
  if (unitNumber) {
    const dup = db().prepare("SELECT id FROM vehicles WHERE unit_number = ?").get(unitNumber);
    if (dup) errors.unit_number = ["The unit number has already been taken."];
  }
  if (plateNumber) {
    const dup = db().prepare("SELECT id FROM vehicles WHERE plate_number = ?").get(plateNumber);
    if (dup) errors.plate_number = ["The plate number has already been taken."];
  }

  if (Object.keys(errors).length > 0) {
    return jsonValidationError("Validation failed.", errors, 422);
  }

  // Create the vehicle — starts UNASSIGNED (per the vehicle-assignment
  // refactor: no driver_id / conductor_id / active_shift_id here).
  const id = randomUUID();
  db().prepare(
    `INSERT INTO vehicles (id, unit_number, plate_number, route, route_id, vehicle_type, status, driver_id, conductor_id, active_shift_id, capacity_status)
     VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, 'AVAILABLE')`
  ).run(id, unitNumber, plateNumber, route, vehicleType, status);

  const row = db().prepare("SELECT * FROM vehicles WHERE id = ?").get(id) as VehicleRow;
  return jsonData({
    id: row.id,
    unit_number: row.unit_number,
    plate_number: row.plate_number,
    vehicle_type: row.vehicle_type,
    route: row.route,
    route_id: row.route_id,
    status: row.status,
    capacity_status: row.capacity_status,
    driver_id: null,
    conductor_id: null,
    active_shift_id: null,
    driver: null,
    conductor: null,
    route_obj: null,
  }, 201);
}
