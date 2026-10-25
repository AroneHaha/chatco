"use client";

// components/admin/analytics/demand-map.tsx
//
// Plots demand zones geographically. The analytics endpoint has always
// returned `lat`/`lng` for every zone (joined from fare_points) and the UI
// never used them — the zones were only ever a ranked text list, which
// can't show that three of the top five are on the same stretch of road.
//
// Client-only: Leaflet touches `window` at import time.

import { MapContainer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAdminTheme } from "@/contexts/admin-theme-context";
import MapBasemap from "@/components/maps/map-basemap";
import type { AnalyticsHeatmapZone } from "@/lib/admin/services/analytics.service";

interface Props {
  zones: AnalyticsHeatmapZone[];
}

export default function DemandMap({ zones }: Props) {
  const [theme] = useAdminTheme();
  // One colour for every zone (UI rules: no colour coding); size carries volume.
  const markerColor = theme === "light" ? "#1A5FB4" : "#62A0EA";
  if (zones.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-600 admin-light:text-slate-500 text-xs">
        No geolocated demand data in this range.
      </div>
    );
  }

  // Centre on the mean of the plotted zones so the view frames the actual
  // data rather than a hardcoded coordinate.
  const centerLat = zones.reduce((s, z) => s + z.lat, 0) / zones.length;
  const centerLng = zones.reduce((s, z) => s + z.lng, 0) / zones.length;
  const maxCommuters = Math.max(...zones.map(z => z.commuters), 1);

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={12}
      scrollWheelZoom={false}
      className="h-full w-full rounded-md bg-[#0E1628] admin-light:bg-white"
    >
      <MapBasemap
        theme={theme}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {zones.map(z => (
        <CircleMarker
          key={`${z.zone}-${z.lat}-${z.lng}`}
          center={[z.lat, z.lng]}
          // Area-proportional-ish sizing: radius scales with the square root
          // of volume so a 4x busier zone reads as 2x the radius rather than
          // 4x, which would visually overstate it.
          radius={6 + Math.sqrt(z.commuters / maxCommuters) * 18}
          pathOptions={{
            color: markerColor,
            fillColor: markerColor,
            fillOpacity: 0.45,
            weight: 1.5,
          }}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            <div className="text-xs">
              <span className="font-semibold">{z.zone}</span>
              <br />
              {z.commuters} boardings
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
