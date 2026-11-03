export type RouteCoordinate = [number, number];

/** A route has one live line, replaced in place on save; no versions or drafts. */
export interface AdminRoute {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  vehicles_count: number;
  fare_points_count: number;
  /** The live road line; empty until one is saved. */
  geometry: RouteCoordinate[];
  /** Editor control points the line was generated from. */
  waypoints: RouteCoordinate[];
  updated_at: string | null;
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
    // Validation failures carry the real reason in `errors`, under a generic message.
    const errors = body?.errors as Record<string, string[]> | undefined;
    const specific = errors ? Object.values(errors).flat().find(Boolean) : undefined;
    throw new RouteServiceError(specific ?? body?.message ?? `Request failed (HTTP ${response.status})`, response.status);
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

/** Replaces the route's line; it is live on every map on the next fetch. */
export function saveRouteGeometry(
  routeId: string,
  input: { geometry: RouteCoordinate[]; waypoints: RouteCoordinate[] }
): Promise<AdminRoute> {
  return request<AdminRoute>(`/api/admin/routes/${routeId}/geometry`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteRoute(routeId: string): Promise<null> {
  return request<null>(`/api/admin/routes/${routeId}`, { method: "DELETE" });
}

export function previewRoadGeometry(waypoints: RouteCoordinate[]): Promise<RoadPreview> {
  return request<RoadPreview>("/api/admin/routes/preview", {
    method: "POST",
    body: JSON.stringify({ waypoints }),
  });
}
