export interface ConductorProfile {
  id: string;
  name: string;
}

export interface ConductorUnit {
  id: string;
  unitNumber: string;
  plateNumber: string;
  route: string;
  /** UUID of the vehicle's assigned route — sent to Laravel as `route_id`
   *  when starting a shift. Present when the unit comes from the backend. */
  routeId?: string;
  status: "available" | "in-use" | "maintenance" | "assigned";
  /** Why this unit can't start a shift (the backend's start-shift refusal
   *  text), or null/undefined when it is available. */
  unavailableReason?: string | null;
}

export interface ConductorDriver {
  id: string;
  name: string;
  status: "available" | "on-shift" | "inactive" | "assigned";
  /** Same as ConductorUnit.unavailableReason. */
  unavailableReason?: string | null;
}

export interface ConductorHailRequest {
  id: string;
  commuterName: string;
  latitude: number;
  longitude: number;
  label?: string;
  etaMinutes?: number;
}
