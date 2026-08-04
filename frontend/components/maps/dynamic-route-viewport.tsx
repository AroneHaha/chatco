"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type L from "leaflet";

interface DynamicRouteViewportProps {
  routeBounds: L.LatLngBounds;
  mapBounds: L.LatLngBounds;
}

/** Keeps Leaflet's immutable MapContainer viewport in sync with published routes. */
export default function DynamicRouteViewport({ routeBounds, mapBounds }: DynamicRouteViewportProps) {
  const map = useMap();

  useEffect(() => {
    map.setMaxBounds(mapBounds);
    map.fitBounds(routeBounds, {
      animate: false,
      padding: [20, 20],
    });
  }, [map, mapBounds, routeBounds]);

  return null;
}
