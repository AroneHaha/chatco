// components/maps/map-theme.ts
// On-map colours for each app appearance. Each map reads its own app's theme
// (commuter/conductor via useCommuterTheme, admin via useAdminTheme) and
// passes it here and to <MapBasemap>, so the map follows the app's light/dark
// setting instead of always drawing the dark basemap.
import type { AppTheme } from "@/lib/theme/theme-store";

/** A CARTO basemap style, e.g. "dark_all" or "rastertiles/voyager". */
export function cartoTileUrl(style: string): string {
  return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`;
}

/**
 * Colours drawn on the map itself, which must contrast with the basemap:
 * `surface` fills the container before tiles load, `route` is the published
 * route line (Sky Blue on dark, CHATCO Blue on light), and `neutral` is the
 * uncoloured pickup-radius ring.
 */
export const MAP_COLORS = {
  dark: { surface: "#050F1A", route: "#62A0EA", neutral: "#FFFFFF" },
  light: { surface: "#F7F5F2", route: "#1A5FB4", neutral: "#071A2E" },
} as const satisfies Record<AppTheme, { surface: string; route: string; neutral: string }>;
