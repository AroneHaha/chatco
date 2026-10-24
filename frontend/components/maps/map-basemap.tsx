"use client";

// components/maps/map-basemap.tsx
// The CARTO basemap for a map's current appearance. Dark is dark_all, greyed
// out by `.map-tiles-mono` (globals.css). Light is Voyager in its natural
// colours (green parks, blue water, tinted main roads), whose labels are
// already dark enough to read without a filter.

import { TileLayer } from "react-leaflet";
import type { AppTheme } from "@/lib/theme/theme-store";
import { cartoTileUrl } from "./map-theme";

export default function MapBasemap({ theme, attribution }: { theme: AppTheme; attribution?: string }) {
  if (theme === "dark") {
    return <TileLayer className="map-tiles-mono" attribution={attribution} url={cartoTileUrl("dark_all")} />;
  }
  return <TileLayer attribution={attribution} url={cartoTileUrl("rastertiles/voyager")} />;
}
