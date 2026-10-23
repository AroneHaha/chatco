// components/commuter/commuter-map/commuter-map-icons.ts
// Extracted from commuter-map.tsx — Leaflet icon generators and capacity config.
//
// WHY SPLIT: Icon definitions (commuterIcon, getJeepneyIcon) and capacity
// config were inline in the 560-line component. Extracting them makes the
// map component focused on layout/rendering, and icons can be tested/reused.

import L from "leaflet";
import { mdiJeepney } from "@mdi/js";
import { COMMUTER_PIN_SIZE, commuterPinHtml } from "@/components/maps/commuter-pin";

// --- CAPACITY CONFIG ---

export type VehicleCapacity = "AVAILABLE" | "STANDING" | "FULL";

export const getCapacityConfig = (capacity: VehicleCapacity) => {
  switch (capacity) {
    case "AVAILABLE": return { color: "#22c55e", label: "Available", twBg: "bg-green-500/10", twText: "text-green-400", twBorder: "border-green-500/30" };
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

/** Commuter's own GPS location pin — MDI account icon on CHATCO Blue */
export function createCommuterIcon(): L.DivIcon {
  return new L.DivIcon({
    className: "custom-commuter-icon",
    html: commuterPinHtml("#1A5FB4"),
    iconSize: [COMMUTER_PIN_SIZE, COMMUTER_PIN_SIZE],
    iconAnchor: [COMMUTER_PIN_SIZE / 2, COMMUTER_PIN_SIZE / 2],
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="${config.color}" aria-hidden="true">
                  <path d="${mdiJeepney}" />
                </svg>
                ${greenDot}
              </div>`,
    iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -25],
  });
  jeepneyIconCache.set(cacheKey, icon);
  return icon;
}
