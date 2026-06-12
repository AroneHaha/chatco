// lib/admin/services/api-mode.ts
// Same pattern as lib/conductor/services/api-mode.ts.

export function shouldUseAdminApi(): boolean {
  return process.env.NEXT_PUBLIC_ADMIN_API_MODE !== "local";
}
