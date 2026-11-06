"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// Same 20px on every side as the initial fitBounds below.
const PADDING_PX = 20;
const LARGE_SCREEN = "(min-width: 1024px)";

interface DynamicRouteViewportProps {
  routeBounds: L.LatLngBounds;
  mapBounds: L.LatLngBounds;
  /**
   * On large screens, stop zooming out at the zoom that just fits the whole
   * route, so the map never shrinks into the wider region. Follows window
   * resizes; phones keep the MapContainer's own minZoom.
   */
  limitZoomOutToRoute?: boolean;
}

/** Keeps Leaflet's immutable MapContainer viewport in sync with published routes. */
export default function DynamicRouteViewport({ routeBounds, mapBounds, limitZoomOutToRoute = false }: DynamicRouteViewportProps) {
  const map = useMap();
  const baseMinZoom = useRef<number | null>(null);

  useEffect(() => {
    map.setMaxBounds(mapBounds);
    map.fitBounds(routeBounds, {
      animate: false,
      padding: [PADDING_PX, PADDING_PX],
    });
  }, [map, mapBounds, routeBounds]);

  useEffect(() => {
    if (!limitZoomOutToRoute) return;
    // The MapContainer's own minZoom, restored below 1024px.
    baseMinZoom.current ??= map.getMinZoom();
    const query = window.matchMedia(LARGE_SCREEN);

    const apply = () => {
      const fitZoom = map.getBoundsZoom(routeBounds, false, L.point(PADDING_PX * 2, PADDING_PX * 2));
      // setMinZoom also zooms in if the view is currently further out.
      map.setMinZoom(query.matches ? fitZoom : baseMinZoom.current ?? fitZoom);
    };

    apply();
    map.on("resize", apply);
    query.addEventListener("change", apply);
    return () => {
      map.off("resize", apply);
      query.removeEventListener("change", apply);
    };
  }, [map, routeBounds, limitZoomOutToRoute]);

  return null;
}
