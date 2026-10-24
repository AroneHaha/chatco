import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { defaultSafetyConfig } from "@/app/(admin)/settings/data/settings-data";

const NOMINATIM_URL = process.env.NOMINATIM_URL;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const responseCache = new Map<string, { location: string | null; expiresAt: number }>();
const pendingLookups = new Map<string, Promise<string | null>>();
let requestQueue: Promise<void> = Promise.resolve();
let lastNominatimRequestAt = 0;

function formatLocation(address: Record<string, string> | undefined, displayName: string | undefined): string | null {
  if (!address) return displayName?.trim() || null;

  const road = address.road || address.pedestrian || address.residential;
  const neighborhood = address.neighbourhood || address.suburb || address.quarter || address.hamlet;
  const locality = address.city || address.town || address.municipality || address.village || address.county;
  const parts = [road, neighborhood, locality].filter((part): part is string => !!part?.trim());
  const uniqueParts = parts.filter((part, index) => parts.findIndex(candidate => candidate.toLowerCase() === part.toLowerCase()) === index);
  return uniqueParts.join(", ") || displayName?.trim() || null;
}

async function lookupLocation(lat: number, lon: number): Promise<string | null> {
  // SOS coordinates are sensitive. Only send them to a deliberately
  // configured, approved geocoding service; never default to a public API.
  if (!NOMINATIM_URL) return null;

  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.location;
  if (cached) responseCache.delete(key);

  const existing = pendingLookups.get(key);
  if (existing) return existing;

  const lookup = requestQueue.then(async () => {
    const waitMs = Math.max(0, 1000 - (Date.now() - lastNominatimRequestAt));
    if (waitMs) await new Promise(resolve => setTimeout(resolve, waitMs));
    lastNominatimRequestAt = Date.now();

    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("zoom", "16");
    url.searchParams.set("addressdetails", "1");

    const origin = process.env.NEXT_PUBLIC_APP_URL;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ChatcoAdminMonitoring/1.0",
        ...(origin ? { Referer: origin } : {}),
      },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const result = await response.json() as {
      address?: Record<string, string>;
      display_name?: string;
    };
    return formatLocation(result.address, result.display_name);
  });
  requestQueue = lookup.then(() => undefined, () => undefined);
  pendingLookups.set(key, lookup);

  try {
    const location = await lookup;
    if (location) {
      responseCache.set(key, { location, expiresAt: Date.now() + CACHE_TTL_MS });
      while (responseCache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = responseCache.keys().next().value;
        if (!oldestKey) break;
        responseCache.delete(oldestKey);
      }
    }
    return location;
  } catch {
    return null;
  } finally {
    pendingLookups.delete(key);
  }
}

/**
 * Return the configured emergency contact and, when lat/lon are given, the
 * SOS coordinate's address. The resolution modal omits them because the
 * monitoring page has already resolved each alert's address.
 */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const rawLat = search.get("lat");
  const rawLon = search.get("lon");
  const hasCoordinates = rawLat !== null || rawLon !== null;
  const lat = rawLat === null || rawLat.trim() === "" ? Number.NaN : Number(rawLat);
  const lon = rawLon === null || rawLon.trim() === "" ? Number.NaN : Number(rawLon);
  if (hasCoordinates && (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180)) {
    return jsonError("A valid latitude and longitude are required.", 422);
  }

  // Laravel validates the session and ADMIN role before this route performs
  // the external reverse-geocoding request.
  const settingsResult = await proxyToLaravel(request, "/admin/settings?category=safety", { method: "GET" });
  if (!settingsResult.ok) return jsonError(settingsResult.message ?? "Unable to load emergency contact settings.", settingsResult.status);

  const settings = settingsResult.data as Record<string, string> | null;
  const emergencyHotline = settings?.emergency_hotline?.trim() || defaultSafetyConfig.emergencyHotline || null;
  const location = hasCoordinates ? await lookupLocation(lat, lon) : null;

  return jsonData({
    location,
    emergency_hotline: emergencyHotline,
    attribution: process.env.NOMINATIM_ATTRIBUTION || (NOMINATIM_URL ? "© OpenStreetMap contributors" : null),
  });
}
