"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ConductorHailRequest } from "@/lib/conductor/types";

interface ConductorMapProps {
  unitNumber?: string;
  hails?: ConductorHailRequest[];
}

const MAP_CENTER: [number, number] = [14.5995, 120.9842]; // Manila
const DEFAULT_ZOOM = 12;
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export default function ConductorMap({ unitNumber = "—", hails = [] }: ConductorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-left");

    // Add vehicle marker
    const vehicleEl = document.createElement("div");
    vehicleEl.innerHTML = `
      <div style="width: 36px; height: 36px; background: #071A2E; border-radius: 50%; border: 2px solid #1A5FB4; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(26,95,180,0.4);">
        <span style="color: #1A5FB4; font-size: 12px; font-weight: bold;">🚌</span>
      </div>
    `;
    new maplibregl.Marker({ element: vehicleEl })
      .setLngLat(MAP_CENTER)
      .setPopup(new maplibregl.Popup().setHTML(`<strong>${unitNumber}</strong><br/>Active`))
      .addTo(map);

    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo({ center: [longitude, latitude], zoom: 14 });
        },
        () => {
          // Use default center
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update hails markers when hails change
  useEffect(() => {
    if (!mapRef.current) return;
    // In a full implementation, we'd add/update hail markers here
  }, [hails]);

  return <div ref={mapContainer} className="w-full h-full" style={{ background: "#050F1A" }} />;
}
