"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";

type RouteCoordinate = [number, number];
type RouteSource = "backend" | "fallback";

function coordinatesMatch(left: RouteCoordinate[], right: RouteCoordinate[]) {
  return left.length === right.length
    && left.every((coordinate, index) =>
      coordinate[0] === right[index][0] && coordinate[1] === right[index][1]);
}

export function useRouteGeometry(fallback: RouteCoordinate[], routeId?: string | null) {
  const [routeCoords, setRouteCoords] = useState<RouteCoordinate[]>(fallback);
  const [routeName, setRouteName] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [source, setSource] = useState<RouteSource>("fallback");

  useEffect(() => {
    const controller = new AbortController();
    const url = routeId
      ? `/api/route-geometry?route_id=${encodeURIComponent(routeId)}`
      : "/api/route-geometry";

    const refresh = () => void fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((body) => {
        const coordinates = (body.data?.coordinates ?? [])
          .filter(
            (coordinate: unknown) =>
              Array.isArray(coordinate) &&
              coordinate.length >= 2 &&
              Number.isFinite(Number(coordinate[0])) &&
              Number.isFinite(Number(coordinate[1]))
          )
          .map(
            (coordinate: [number | string, number | string]) =>
              [Number(coordinate[0]), Number(coordinate[1])] as RouteCoordinate
          );

        if (coordinates.length >= 2) {
          setRouteCoords((current) => coordinatesMatch(current, coordinates) ? current : coordinates);
          setRouteName(typeof body.data?.name === "string" ? body.data.name : null);
          setVersion(Number.isFinite(Number(body.data?.version?.number))
            ? Number(body.data.version.number)
            : null);
          setSource("backend");
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });

    refresh();
    const interval = window.setInterval(refresh, 60_000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [fallback, routeId]);

  return useMemo(() => {
    const rawBounds = L.latLngBounds(routeCoords);
    const routeBounds = rawBounds.pad(0.008);
    const mapBounds = L.latLngBounds(
      [rawBounds.getSouth() - 0.04, rawBounds.getWest() - 0.1],
      [rawBounds.getNorth() + 0.015, rawBounds.getEast() + 0.1]
    );

    return {
      routeCoords,
      routeName,
      version,
      source,
      routeBounds,
      mapBounds,
      mapBoundsArray: [
        [mapBounds.getSouth(), mapBounds.getWest()],
        [mapBounds.getNorth(), mapBounds.getEast()],
      ] as [[number, number], [number, number]],
      center: [rawBounds.getCenter().lat, rawBounds.getCenter().lng] as L.LatLngTuple,
    };
  }, [routeCoords, routeName, source, version]);
}
