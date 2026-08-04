"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Crosshair, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { RouteCoordinate } from "@/lib/admin/services/route.service";

interface FarePointMapPickerProps {
  value: RouteCoordinate | null;
  onChange: (coordinate: RouteCoordinate) => void;
  routeGeometry?: RouteCoordinate[];
}

const pickerIcon = L.divIcon({
  className: "fare-point-picker-marker",
  html: '<div style="width:30px;height:30px;border-radius:999px;background:#F97316;border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,.5)"></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function PickerEvents({ onChange }: { onChange: (coordinate: RouteCoordinate) => void }) {
  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function PickerViewport({ value, routeGeometry }: Pick<FarePointMapPickerProps, "value" | "routeGeometry">) {
  const map = useMap();

  useEffect(() => {
    if (value) {
      map.setView(value, Math.max(map.getZoom(), 16), { animate: false });
      return;
    }
    if (routeGeometry && routeGeometry.length >= 2) {
      map.fitBounds(L.latLngBounds(routeGeometry).pad(0.08), { animate: false });
    }
  }, [map, routeGeometry, value]);

  return null;
}

export default function FarePointMapPicker({ value, onChange, routeGeometry = [] }: FarePointMapPickerProps) {
  const center = useMemo<L.LatLngTuple>(() => {
    if (value) return value;
    if (routeGeometry.length >= 2) {
      const centerPoint = L.latLngBounds(routeGeometry).getCenter();
      return [centerPoint.lat, centerPoint.lng];
    }
    return [14.82, 120.86];
  }, [routeGeometry, value]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050F1A]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Crosshair size={14} className="text-[#62A0EA]" />
          Click the exact stop on the map, then drag the orange marker to adjust.
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/35">
          <MapPin size={12} />
          {value ? `${value[0].toFixed(6)}, ${value[1].toFixed(6)}` : "No location selected"}
        </div>
      </div>
      <div className="h-[320px]">
        <MapContainer center={center} zoom={13} className="h-full w-full" attributionControl>
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {routeGeometry.length >= 2 && (
            <Polyline positions={routeGeometry} pathOptions={{ color: "#2563EB", weight: 5, opacity: 0.65 }} />
          )}
          {value && (
            <Marker
              position={value}
              icon={pickerIcon}
              draggable
              eventHandlers={{
                dragend(event) {
                  const location = event.target.getLatLng();
                  onChange([location.lat, location.lng]);
                },
              }}
            />
          )}
          <PickerEvents onChange={onChange} />
          <PickerViewport value={value} routeGeometry={routeGeometry} />
        </MapContainer>
      </div>
    </div>
  );
}
