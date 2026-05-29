// lib/vehicle-simulation.ts
// Lightweight vehicle route progression simulation.
// Reuses existing mock vehicle structure and route coordinates.
//
// BACKEND-PROOFING:
// TODO: Replace entire module with WebSocket subscription: ws://api/vehicles/locations
// TODO: Or REST polling fallback: GET /api/vehicles/active

/** Represents a simulated vehicle moving along a route */
export interface SimulatedVehicle {
  id: string;
  plateNumber: string;
  driverName: string;
  conductorName: string;
  routeIndex: number;
  capacity: "AVAILABLE" | "STANDING" | "FULL";
}

/**
 * Advance a vehicle's position along the route by the given step.
 * Wraps around at the end of the route to simulate continuous operation.
 *
 * WHY NEW: Vehicles in the repo are static (fixed routeIndex).
 * ETA is meaningless without movement — the distance would never change.
 * This function provides the minimal movement logic required for real-time ETA.
 */
export function advanceVehicle(
  vehicle: SimulatedVehicle,
  routeLength: number,
  step: number = 1
): SimulatedVehicle {
  return {
    ...vehicle,
    routeIndex: (vehicle.routeIndex + step) % routeLength,
  };
}

/**
 * Advance all vehicles in a fleet by one step.
 *
 * WHY: The commuter map needs to update all vehicle positions simultaneously
 * on each tick. This avoids per-vehicle interval management.
 */
export function advanceAllVehicles(
  vehicles: SimulatedVehicle[],
  routeLength: number,
  step: number = 1
): SimulatedVehicle[] {
  return vehicles.map((v) => advanceVehicle(v, routeLength, step));
}