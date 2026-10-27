/**
 * Share My Ride — position pusher for the commuter's active tracking link.
 *
 * Lives at module level (not in ShareRideModal) so closing the modal or moving
 * to another commuter page doesn't stop the viewer's map from updating. The
 * token is kept in sessionStorage so a reload of the same tab resumes it (see
 * the commuter layout); it stops on Stop sharing, on expiry, or once the
 * backend answers that the link has ended (409).
 *
 * Push cadence, sized to the public page's 5s poll:
 *  - a fix that moved ≥ 8m is sent, at most once every 4s;
 *  - otherwise a fix is sent every 15s, so the viewer can tell a commuter
 *    standing still from one whose sharing has stopped. watchPosition goes
 *    quiet when the device isn't moving, so a fresh fix is requested every
 *    10s for that.
 */
import { haversineMeters } from "@/lib/utils/geo";

const MIN_PUSH_INTERVAL_MS = 4_000;
const MIN_PUSH_DISTANCE_METERS = 8;
const STATIONARY_PUSH_MS = 15_000;
const FIX_REQUEST_MS = 10_000;
const STORAGE_KEY = "chatco_share_ride";

export type ShareGpsStatus = "idle" | "requesting" | "success" | "error";

interface ShareLink {
  token: string;
  expiresAt: string;
  /** The commuter who started it — a resume after another login is ignored. */
  ownerId: string;
}

interface Fix {
  lat: number;
  lng: number;
}

let link: ShareLink | null = null;
let watchId: number | null = null;
let fixTimer: ReturnType<typeof setInterval> | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | null = null;
let latestFix: Fix | null = null;
let lastSent: (Fix & { at: number }) | null = null;
let pushInFlight = false;
let gpsStatus: ShareGpsStatus = "idle";
const statusListeners = new Set<(status: ShareGpsStatus) => void>();

function setGpsStatus(status: ShareGpsStatus) {
  if (status === gpsStatus) return;
  gpsStatus = status;
  statusListeners.forEach((listener) => listener(status));
}

export function subscribeShareGpsStatus(listener: (status: ShareGpsStatus) => void): () => void {
  statusListeners.add(listener);
  listener(gpsStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

export function getActiveShareLink(): Readonly<ShareLink> | null {
  return link;
}

async function push(fix: Fix) {
  if (!link || pushInFlight) return;

  const now = Date.now();
  if (lastSent) {
    const elapsed = now - lastSent.at;
    if (elapsed < MIN_PUSH_INTERVAL_MS) return;
    const moved = haversineMeters(lastSent.lat, lastSent.lng, fix.lat, fix.lng);
    if (moved < MIN_PUSH_DISTANCE_METERS && elapsed < STATIONARY_PUSH_MS) return;
  }

  const token = link.token;
  lastSent = { ...fix, at: now };
  pushInFlight = true;
  try {
    // Sending the token makes the backend refuse (409) a push for a link that
    // was stopped or expired, instead of quietly starting a new one.
    const res = await fetch("/api/commuter/share-ride", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token, lat: fix.lat, lng: fix.lng }),
    });
    // Ended elsewhere (Stop sharing on another device, expiry) or signed out.
    if ((res.status === 409 || res.status === 401 || res.status === 403) && link?.token === token) {
      stopShareTracking();
    }
  } catch {
    // Offline for a moment — the next fix retries.
  } finally {
    pushInFlight = false;
  }
}

function onFix(pos: GeolocationPosition) {
  setGpsStatus("success");
  latestFix = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  void push(latestFix);
}

function onFixError() {
  if (gpsStatus !== "success") setGpsStatus("error");
}

/**
 * Start watching GPS. Called before the link exists so the first fix isn't
 * lost while the link is being created — it is held and sent on attach.
 */
export function beginShareTracking() {
  if (watchId != null) return;
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    setGpsStatus("error");
    return;
  }
  setGpsStatus("requesting");
  watchId = navigator.geolocation.watchPosition(onFix, onFixError, {
    enableHighAccuracy: true,
    maximumAge: 5_000,
    timeout: 15_000,
  });
}

/** Bind the watch to a created link and send the held fix straight away. */
export function attachShareLink(token: string, expiresAt: string, ownerId: string) {
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (!(msLeft > 0)) {
    stopShareTracking();
    return;
  }

  if (link?.token !== token) lastSent = null;
  link = { token, expiresAt, ownerId };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(link));
  } catch {
    // Storage blocked — tracking still runs, it just won't survive a reload.
  }

  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = setTimeout(stopShareTracking, msLeft);

  if (!fixTimer && typeof navigator !== "undefined" && navigator.geolocation) {
    fixTimer = setInterval(() => {
      navigator.geolocation.getCurrentPosition(onFix, onFixError, {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: FIX_REQUEST_MS,
      });
    }, FIX_REQUEST_MS);
  }

  if (latestFix) void push(latestFix);
}

/** Stops pushing locally. Deactivating the link itself is the DELETE call. */
export function stopShareTracking() {
  if (watchId != null && typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
  if (fixTimer) clearInterval(fixTimer);
  fixTimer = null;
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = null;
  link = null;
  latestFix = null;
  lastSent = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked — nothing was saved.
  }
  setGpsStatus("idle");
}

/** After a reload, pick the same tab's live link back up for the same commuter. */
export function resumeShareTracking(ownerId: string) {
  if (link) return;
  let saved: ShareLink | null = null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    saved = raw ? (JSON.parse(raw) as ShareLink) : null;
  } catch {
    return;
  }
  if (!saved?.token || !saved.expiresAt) return;
  if (saved.ownerId !== ownerId || new Date(saved.expiresAt).getTime() <= Date.now()) {
    stopShareTracking();
    return;
  }
  beginShareTracking();
  attachShareLink(saved.token, saved.expiresAt, saved.ownerId);
}
