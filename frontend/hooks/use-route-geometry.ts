"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";

type RouteCoordinate = [number, number];

interface FareMatrixPoint {
  pointNumber: number;
  latitude: number | null;
  longitude: number | null;
}

export function useRouteGeometry(fallback: RouteCoordinate[]) {
  const [routeCoords, setRouteCoords] = useState<RouteCoordinate[]>(fallback);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/fare-matrix", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((body) => {
        const points = (body.data?.points ?? []) as FareMatrixPoint[];
        const coordinates = points
          .filter(
            (point) =>
              Number.isFinite(Number(point.latitude)) &&
              Number.isFinite(Number(point.longitude)) &&
              point.latitude !== null &&
              point.longitude !== null
          )
          .sort((a, b) => a.pointNumber - b.pointNumber)
          .map((point) => [Number(point.latitude), Number(point.longitude)] as RouteCoordinate);

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
