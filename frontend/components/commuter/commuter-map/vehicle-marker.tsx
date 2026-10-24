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
import { memo, useMemo } from "react";
import { Marker, Circle } from "react-leaflet";
import UnitPopup, { capacityTone } from "@/components/maps/unit-popup";
import { formatDistance } from "@/lib/shared/geo/nearby-detector";
import { getCapacityConfig, createJeepneyIcon, type VehicleCapacity } from "./commuter-map-icons";
import { MAP_COLORS } from "@/components/maps/map-theme";
import { useCommuterTheme } from "@/contexts/commuter-theme-context";

export interface VehicleMarkerProps {
  vehicleId: string;
  onSelect: (vehicleId: string) => void;
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
  vehicleId,
  onSelect,
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
  const mapColors = MAP_COLORS[useCommuterTheme()];
  const position: [number, number] = [lat, lng];
  const eventHandlers = useMemo(() => ({
    click: (event: import("leaflet").LeafletEvent) => {
      if (!window.matchMedia("(min-width: 1024px)").matches) return;
      onSelect(vehicleId);
      // Leaflet's native popup click listener also runs; close it after dispatch.
      queueMicrotask(() => event.target.closePopup());
    },
  }), [vehicleId, onSelect]);

  return (
    <>
      <Circle
        center={position}
        radius={1000}
        pathOptions={{
          color: isWithinRadius ? mapColors.neutral : mapColors.route,
          weight: 1,
          opacity: isWithinRadius ? 0.4 : 0.15,
          fillColor: isWithinRadius ? mapColors.neutral : mapColors.route,
          fillOpacity: isWithinRadius ? 0.04 : 0.01,
          dashArray: "4 8",
        }}
      />
      {/* Keep vehicles above the commuter's location pin when icons overlap. */}
      <Marker position={position} icon={createJeepneyIcon(capacity, isWithinRadius)} eventHandlers={eventHandlers} zIndexOffset={1000}>
        <UnitPopup
          title={plateNumber}
          status={{ label: config.label, tone: capacityTone(capacity) }}
          details={[
            { label: "Route", value: routeName ?? "—" },
            ...(distanceInMeters !== null ? [{ label: "Distance", value: formatDistance(distanceInMeters) }] : []),
            ...(isWithinRadius && estimatedArrivalMinutes !== null ? [{ label: "ETA", value: `~${estimatedArrivalMinutes} min` }] : []),
          ]}
          notes={capacity === "FULL"
            ? [{ message: "Not accepting passengers", tone: "danger" }]
            : distanceInMeters !== null && !isWithinRadius
              ? [{ message: "Outside pickup radius", tone: "warning" }]
              : []}
        />
      </Marker>
    </>
  );
}

function propsAreEqual(prev: VehicleMarkerProps, next: VehicleMarkerProps): boolean {
  return (
    prev.vehicleId === next.vehicleId &&
    prev.onSelect === next.onSelect &&
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
