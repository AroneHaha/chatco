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
