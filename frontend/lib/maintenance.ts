export const MAINTENANCE_ROLES = ['COMMUTER', 'CONDUCTOR'] as const;
export type MaintenanceRole = (typeof MAINTENANCE_ROLES)[number];

export function parseMaintenanceRoles(value: unknown): MaintenanceRole[] {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { value = undefined; }
  }
  // Older settings apply maintenance to both apps.
  return Array.isArray(value)
    ? MAINTENANCE_ROLES.filter(role => value.includes(role))
    : [...MAINTENANCE_ROLES];
}

/**
 * Fired on window when an API call comes back 503, so MaintenanceGate re-checks
 * /api/system-status right away instead of waiting for the next tab focus.
 */
export const MAINTENANCE_SUSPECTED_EVENT = 'chatco:maintenance-suspected';
