const DEVICE_KEY = "chatco_conductor_device_v1";

/** Stable installation/browser identifier used only for shift-operation
 * coordination. It is not an authentication credential. */
export function getConductorDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const id = `web-${random}`;
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

export const CONDUCTOR_DEVICE_TYPE = "WEB" as const;
