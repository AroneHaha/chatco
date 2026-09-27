/**
 * Conductor "Clear App Cache" + the Scan Sound preference.
 *
 * Only read caches the server can repopulate are cleared. Deliberately kept:
 *   - conductor_shift                 the active shift (clearing would look
 *                                     like the shift ended)
 *   - conductor_pending_cash_v1       offline cash not yet synced (clearing
 *                                     would lose money)
 *   - chatco_conductor_device_v1      this device's identity; the shift's
 *                                     operating-device ownership is tied to it
 *   - conductor_txns_<active shift>   offline fallback for the running shift
 */

const SCAN_SOUND_KEY = "conductor_scan_sound";
const SCAN_SOUND_EVENT = "conductor:scan-sound-changed";
const CLEARABLE_KEYS = ["conductor_remittance_history", "conductor_shift_logs"];
const TXN_CACHE_PREFIX = "conductor_txns_";

/** Returns how many cached entries were removed. */
export function clearConductorCache(activeShiftId: string | null): number {
  if (typeof window === "undefined") return 0;
  const keep = activeShiftId ? `${TXN_CACHE_PREFIX}${activeShiftId}` : null;
  const toRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (CLEARABLE_KEYS.includes(key) || (key.startsWith(TXN_CACHE_PREFIX) && key !== keep)) {
      toRemove.push(key);
    }
  }

  toRemove.forEach((key) => localStorage.removeItem(key));
  return toRemove.length;
}

export function getScanSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SCAN_SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setScanSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SCAN_SOUND_KEY, enabled ? "on" : "off");
  } catch {
    // Storage unavailable (private mode); nothing to persist.
  }
  window.dispatchEvent(new Event(SCAN_SOUND_EVENT));
}

/** useSyncExternalStore subscription: this tab's writes and other tabs'. */
export function subscribeScanSound(onChange: () => void): () => void {
  window.addEventListener(SCAN_SOUND_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SCAN_SOUND_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
