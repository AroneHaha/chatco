// components/commuter/commuter-map/commuter-map-icons.ts
// Extracted from commuter-map.tsx — Leaflet icon generators and capacity config.
//
// WHY SPLIT: Icon definitions (commuterIcon, getJeepneyIcon) and capacity
// config were inline in the 560-line component. Extracting them makes the
// map component focused on layout/rendering, and icons can be tested/reused.

import L from "leaflet";
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

// Live unit markers: components/maps/bus-marker-icon.ts (shared by all maps).
