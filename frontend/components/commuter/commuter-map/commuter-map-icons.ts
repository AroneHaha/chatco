// components/commuter/commuter-map/commuter-map-icons.ts
// Extracted from commuter-map.tsx — Leaflet icon generators and capacity config.
//
// WHY SPLIT: Icon definitions (commuterIcon, getJeepneyIcon) and capacity
// config were inline in the 560-line component. Extracting them makes the
// map component focused on layout/rendering, and icons can be tested/reused.

import L from "leaflet";

// --- CAPACITY CONFIG ---

export type VehicleCapacity = "AVAILABLE" | "STANDING" | "FULL";

export const getCapacityConfig = (capacity: VehicleCapacity) => {
  switch (capacity) {
    case "AVAILABLE": return { color: "#22c55e", label: "Maluwag / Available", twBg: "bg-green-500/10", twText: "text-green-400", twBorder: "border-green-500/30" };
    case "STANDING": return { color: "#eab308", label: "Standing Only", twBg: "bg-yellow-500/10", twText: "text-yellow-400", twBorder: "border-yellow-500/30" };
    case "FULL": return { color: "#ef4444", label: "Full", twBg: "bg-red-500/10", twText: "text-red-400", twBorder: "border-red-500/30" };
  }
};

// --- BEARING HELPER ---

export function getBearing(start: [number, number], end: [number, number]): number {
  const startLat = start[0] * Math.PI / 180;
  const endLat = end[0] * Math.PI / 180;
  const dLng = (end[1] - start[1]) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// --- ICONS ---

/** Commuter's own GPS location pin — blue with pulse ring */
export function createCommuterIcon(): L.DivIcon {
  return new L.DivIcon({
    className: "custom-commuter-icon",
    html: `<div style="position: relative; width: 20px; height: 20px;">
              <div style="position: absolute; inset: 0; background: #1A5FB4; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(26,95,180,0.6); z-index: 2;"></div>
              <div style="position: absolute; inset: -5px; background: rgba(26,95,180,0.3); border-radius: 50%; animation: pulse 2s infinite; z-index: 1;"></div>
            </div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  });
}

// Only 3 capacities × 2 radius states exist, so the whole icon set is a
// handful of entries. Caching by that pair means unaffected vehicles keep
// the exact same L.DivIcon reference across re-renders — react-leaflet's
// Marker only calls the (relatively expensive) marker.setIcon() when the
// `icon` prop reference changes, so this skips that DOM work entirely for
// any vehicle whose capacity/radius status didn't change this tick.
const jeepneyIconCache = new Map<string, L.DivIcon>();

/** Jeepney marker icon — dynamic based on capacity + within-radius indicator */
export function createJeepneyIcon(capacity: VehicleCapacity, isWithinRadius: boolean = false): L.DivIcon {
  const cacheKey = `${capacity}:${isWithinRadius}`;
  const cached = jeepneyIconCache.get(cacheKey);
  if (cached) return cached;

  const config = getCapacityConfig(capacity);
  // Green dot indicates commuter is within THIS conductor's 1km radius
  const greenDot = isWithinRadius
    ? `<div style="position: absolute; top: -2px; right: -2px; width: 14px; height: 14px; background: #22c55e; border-radius: 50%; border: 2px solid #071A2E; box-shadow: 0 0 6px rgba(34,197,94,0.6); z-index: 2;"></div>`
    : '';
  const icon = new L.DivIcon({
    className: "custom-jeepney-icon",
    html: `<div style="position: relative; width: 44px; height: 44px; background: #071A2E; border-radius: 50%; border: 2.5px solid ${config.color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(0,0,0,0.5), 0 0 8px ${config.color}40;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${config.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-10.5H6.375c-.621 0-1.125.504-1.125 1.125v6.75m12-6.75h-3.375c-.621 0-1.125.504-1.125 1.125v6.75m0 0H5.625m12-6.75h-1.5m-1.5 0h-1.5" />
                </svg>
                ${greenDot}
              </div>`,
    iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -25],
  });
  jeepneyIconCache.set(cacheKey, icon);
  return icon;
}
