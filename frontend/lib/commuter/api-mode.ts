// lib/commuter/services/api-mode.ts
// Same pattern as lib/conductor/services/api-mode.ts.
//
// When true, commuter services call the API layer (Next.js route stubs by default,
// or an external backend when NEXT_PUBLIC_API_URL is set).
// Set NEXT_PUBLIC_COMMUTER_API_MODE=local to force client-only persistence.

export function shouldUseCommuterApi(): boolean {
  return process.env.NEXT_PUBLIC_COMMUTER_API_MODE !== "local";
}
