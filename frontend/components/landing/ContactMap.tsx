"use client";

// Landing-page contact map: the same Leaflet map and CARTO dark tiles as the
// app, centred on a single pin.
// Loaded client-only (Leaflet needs `window`) and only once it scrolls into view.

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { AttributionControl, MapContainer, Marker, TileLayer, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = [number, number];

const ZOOM = 15;

function pinIcon(label: string) {
  return L.divIcon({
    className: "landing-contact-pin",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `<div style="position:relative;width:16px;height:16px">
      <div style="position:absolute;inset:0;border-radius:9999px;background:#62A0EA;box-shadow:0 0 0 5px rgba(98,160,234,.3)"></div>
      <span style="position:absolute;left:26px;top:50%;transform:translateY(-50%);background:#071A2E;color:#fff;font:600 12px/1 var(--font-poppins),system-ui,sans-serif;padding:7px 11px;border-radius:8px;white-space:nowrap;border:1px solid rgba(255,255,255,.14);box-shadow:0 4px 12px rgba(0,0,0,.4)">${label}</span>
    </div>`,
  });
}

/** Centres on the pin once the container has its final size. */
function Frame({ position }: { position: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.setView(position, ZOOM, { animate: false });
  }, [map, position]);
  return null;
}

interface ContactMapProps {
  position: LatLng;
  label: string;
}

export default function ContactMap({ position, label }: ContactMapProps) {
  const icon = useMemo(() => pinIcon(label), [label]);

  return (
    <div className="contact-map absolute inset-0 z-0">
      <MapContainer
        center={position}
        zoom={ZOOM}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        // One-finger drag on touch screens would trap page scroll; pinch still zooms.
        dragging={!L.Browser.mobile}
        style={{ width: "100%", height: "100%", background: "#050F1A" }}
      >
        <Frame position={position} />
        <TileLayer
          url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <ZoomControl position="bottomright" />
        <AttributionControl position="bottomleft" prefix={false} />

        <Marker position={position} icon={icon} interactive={false} zIndexOffset={200} />
      </MapContainer>

      <style jsx global>{`
        .contact-map .leaflet-container,
        .contact-map .leaflet-bar a {
          font-family: inherit;
        }
        .contact-map .leaflet-control-attribution {
          background: rgba(7, 26, 46, 0.72);
          color: rgba(255, 255, 255, 0.5);
          font-size: 10px;
        }
        .contact-map .leaflet-control-attribution a {
          color: rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </div>
  );
}
