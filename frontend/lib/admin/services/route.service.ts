export type RouteCoordinate = [number, number];

export interface RouteVersion {
  id: string;
  number: number;
  status: "DRAFT" | "PUBLISHED";
  geometry: RouteCoordinate[];
  waypoints: RouteCoordinate[];
  notes: string | null;
  effective_from: string | null;
  effective_until: string | null;
  published_at: string | null;
  is_temporary: boolean;
}

export interface AdminRoute {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  vehicles_count: number;
  fare_points_count: number;
  active_version: RouteVersion | null;
  draft_version: RouteVersion | null;
}

export interface RoadPreview {
  geometry: RouteCoordinate[];
  snapped_waypoints: RouteCoordinate[];
  warnings: Array<{
    code: "LARGE_DETOUR";
    from_index: number;
    to_index: number;
  }>;
}

class RouteServiceError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "RouteServiceError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new RouteServiceError(body?.message ?? `Request failed (HTTP ${response.status})`, response.status);
  }

  return body.data as T;
}

export function listRoutes(): Promise<AdminRoute[]> {
  return request<AdminRoute[]>("/api/admin/routes");
}

export function createRoute(name: string): Promise<AdminRoute> {
  return request<AdminRoute>("/api/admin/routes", {
    method: "POST",
    body: JSON.stringify({ name, status: "INACTIVE", waypoints: [] }),
  });
}

export function saveRouteDraft(
  routeId: string,
  input: { geometry: RouteCoordinate[]; waypoints: RouteCoordinate[]; notes?: string | null }
): Promise<RouteVersion> {
  return request<RouteVersion>(`/api/admin/routes/${routeId}/draft`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function publishRoute(
  routeId: string,
  input: { effective_from?: string | null; effective_until?: string | null; notes?: string | null }
): Promise<RouteVersion> {
  return request<RouteVersion>(`/api/admin/routes/${routeId}/publish`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listRouteVersions(routeId: string): Promise<RouteVersion[]> {
  return request<RouteVersion[]>(`/api/admin/routes/${routeId}/versions`);
}

export function previewRoadGeometry(waypoints: RouteCoordinate[]): Promise<RoadPreview> {
  return request<RoadPreview>("/api/admin/routes/preview", {
    method: "POST",
    body: JSON.stringify({ waypoints }),
  });
}
