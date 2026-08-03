"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";

type RouteCoordinate = [number, number];

export function useRouteGeometry(fallback: RouteCoordinate[]) {
  const [routeCoords, setRouteCoords] = useState<RouteCoordinate[]>(fallback);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/route-geometry", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
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

        if (coordinates.length >= 2) setRouteCoords(coordinates);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });

    return () => controller.abort();
  }, [fallback]);

  return useMemo(() => {
    const rawBounds = L.latLngBounds(routeCoords);
    const routeBounds = rawBounds.pad(0.008);
    const mapBounds = L.latLngBounds(
      [rawBounds.getSouth() - 0.04, rawBounds.getWest() - 0.1],
      [rawBounds.getNorth() + 0.015, rawBounds.getEast() + 0.1]
    );

    return {
      routeCoords,
      routeBounds,
      mapBounds,
      mapBoundsArray: [
        [mapBounds.getSouth(), mapBounds.getWest()],
        [mapBounds.getNorth(), mapBounds.getEast()],
      ] as [[number, number], [number, number]],
      center: [rawBounds.getCenter().lat, rawBounds.getCenter().lng] as L.LatLngTuple,
    };
  }, [routeCoords]);
}
