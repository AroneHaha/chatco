// components/commuter/commuter-map/vehicle-marker.tsx
// One conductor's Circle + Marker + Popup, isolated behind React.memo.
//
// WHY: commuter-map.tsx used to inline `activeVehicles.map(...)` directly in
// its JSX. Every location tick (Pusher event or poll) replaces the whole
// `activeVehicles` array, so that inline map re-created a Marker/Circle
// element for EVERY vehicle on EVERY tick — even the N-1 vehicles that didn't
// move. React reconciles by key, so it didn't remount them, but it did
// re-render and re-apply Leaflet updates for all of them each time. Moving
// each vehicle's rendering into its own memoized component means a location
// update for vehicle A only re-renders vehicle A — B..N bail out via
// React.memo's custom comparator below, since their prop values are
// unchanged (the props objects themselves are still recreated upstream, so
// this must compare by value, not by reference).
import { memo } from "react";
import { Marker, Popup, Circle } from "react-leaflet";
import { formatDistance } from "@/lib/shared/geo/nearby-detector";
import { getCapacityConfig, createJeepneyIcon, type VehicleCapacity } from "./commuter-map-icons";

export interface VehicleMarkerProps {
  lat: number;
  lng: number;
  plateNumber: string;
  routeName: string | null;
  capacity: VehicleCapacity;
  isWithinRadius: boolean;
  distanceInMeters: number | null;
  estimatedArrivalMinutes: number | null;
}

function VehicleMarkerImpl({
  lat,
  lng,
  plateNumber,
  routeName,
  capacity,
  isWithinRadius,
  distanceInMeters,
  estimatedArrivalMinutes,
}: VehicleMarkerProps) {
  const config = getCapacityConfig(capacity);
  const position: [number, number] = [lat, lng];

  return (
    <>
      <Circle
        center={position}
        radius={1000}
        pathOptions={{
          color: isWithinRadius ? "#22c55e" : "#62A0EA",
          weight: 1,
          opacity: isWithinRadius ? 0.4 : 0.15,
          fillColor: isWithinRadius ? "#22c55e" : "#62A0EA",
          fillOpacity: isWithinRadius ? 0.04 : 0.01,
          dashArray: "4 8",
        }}
      />
      <Marker position={position} icon={createJeepneyIcon(capacity, isWithinRadius)}>
        <Popup>
          <div className="space-y-2 min-w-[180px]">
            <div className="flex items-center justify-between">
              <div className="font-bold text-[#071A2E]">{plateNumber}</div>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${config.twBg} ${config.twText} ${config.twBorder} border`}>{config.label}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5 pt-1 border-t border-gray-100">
              <p><span className="font-medium text-gray-700">Route:</span> {routeName ?? "—"}</p>
              {distanceInMeters !== null && (
                <p><span className="font-medium text-gray-700">Distance:</span> {formatDistance(distanceInMeters)}</p>
              )}
              {isWithinRadius && estimatedArrivalMinutes !== null && (
                <p className="text-green-700 font-medium"><span className="font-medium text-gray-700">ETA:</span> ~{estimatedArrivalMinutes} min</p>
              )}
              {distanceInMeters !== null && !isWithinRadius && capacity !== "FULL" && (
                <p className="text-yellow-600 text-[10px] italic">Outside pickup radius</p>
              )}
            </div>
            {capacity === "FULL" && (
              <div className="text-[10px] font-medium text-red-500 bg-red-50 p-1.5 rounded text-center border border-red-100">
                Not accepting passengers
              </div>
            )}
          </div>
        </Popup>
      </Marker>
    </>
  );
}

function propsAreEqual(prev: VehicleMarkerProps, next: VehicleMarkerProps): boolean {
  return (
    prev.lat === next.lat &&
    prev.lng === next.lng &&
    prev.plateNumber === next.plateNumber &&
    prev.routeName === next.routeName &&
    prev.capacity === next.capacity &&
    prev.isWithinRadius === next.isWithinRadius &&
    prev.distanceInMeters === next.distanceInMeters &&
    prev.estimatedArrivalMinutes === next.estimatedArrivalMinutes
  );
}

const VehicleMarker = memo(VehicleMarkerImpl, propsAreEqual);
export default VehicleMarker;
