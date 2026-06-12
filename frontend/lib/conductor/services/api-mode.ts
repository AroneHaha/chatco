/**
 * When true, conductor services call the API layer (Next.js route stubs by default,
 * or an external backend when NEXT_PUBLIC_API_URL is set).
 * Set NEXT_PUBLIC_CONDUCTOR_API_MODE=local to force client-only persistence.
 */
export function shouldUseConductorApi(): boolean {
  return process.env.NEXT_PUBLIC_CONDUCTOR_API_MODE !== "local";
}
