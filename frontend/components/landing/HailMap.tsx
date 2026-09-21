"use client";

// Landing-page mock of the commuter map: the same Leaflet map, tiles, route
// line and jeepney marker as the app, driven entirely by props. It reads the
// static ROUTE_COORDS only — no route-geometry fetch, no tracking hook, no API.

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ROUTE_COORDS } from "@/components/commuter/commuter-map/commuter-map-constants";
import { createJeepneyIcon } from "@/components/commuter/commuter-map/commuter-map-icons";

// The commuter waits at one point on the route; the jeepney starts further up
// the same route and drives toward them as the steps advance.
const BUS_START_IDX = 9;
const HAIL_IDX = 20;

type LatLng = [number, number];

// Cumulative distance (m) at every route vertex, so a 0..1 progress value can
// be turned into a point that always sits exactly on the polyline.
const CUM: number[] = ROUTE_COORDS.reduce<number[]>((acc, c, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + L.latLng(ROUTE_COORDS[i - 1]).distanceTo(L.latLng(c)));
  return acc;
}, []);
const START_D = CUM[BUS_START_IDX];
const HAIL_D = CUM[HAIL_IDX];
const HAIL_POINT = ROUTE_COORDS[HAIL_IDX];

function pointAt(d: number): { point: LatLng; index: number } {
  let i = BUS_START_IDX;
  while (i < HAIL_IDX && CUM[i + 1] < d) i++;
  const span = CUM[i + 1] - CUM[i] || 1;
  const t = Math.max(0, Math.min(1, (d - CUM[i]) / span));
  const [a, b] = [ROUTE_COORDS[i], ROUTE_COORDS[i + 1]];
  return { point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], index: i };
}

function hailIcon(color: string, step: number) {
  const halo = step >= 1 ? 150 : 60;
  const label =
    step === 3
      ? `<span style="position:absolute;left:${halo / 2 + 10}px;top:${halo / 2 + 8}px;display:flex;align-items:center;gap:4px;background:#22C55E;color:#071A2E;font:700 10px/1 var(--font-poppins),system-ui,sans-serif;padding:5px 8px;border-radius:9999px;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.4)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Picked up</span>`
      : "";
  return L.divIcon({
    className: "landing-hail-icon",
    iconSize: [halo, halo],
    iconAnchor: [halo / 2, halo / 2],
    html: `<div style="position:relative;width:${halo}px;height:${halo}px">
      <div style="position:absolute;inset:0;border-radius:9999px;background:radial-gradient(circle,${color}66 0%,${color}22 40%,transparent 70%)"></div>
      <div style="position:absolute;left:50%;top:50%;width:14px;height:14px;transform:translate(-50%,-50%);border-radius:9999px;background:${color};box-shadow:0 0 0 4px ${color}33"></div>
      ${label}
    </div>`,
  });
}

/** Frames the drive (start to hail point), leaving room for the floating panel on wide screens. */
function FrameDrive() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const bounds = L.latLngBounds(ROUTE_COORDS.slice(BUS_START_IDX, HAIL_IDX + 1));
    const wide = window.innerWidth >= 1024;
    map.fitBounds(bounds, {
      animate: false,
      paddingTopLeft: [wide ? 460 : 40, wide ? 70 : 40],
      paddingBottomRight: [wide ? 190 : 60, wide ? 130 : 90],
    });
  }, [map]);
  return null;
}

interface HailMapProps {
  step: number;
  color: string;
  /** Where the jeepney is on its drive to the hail point, 0 (start) to 1 (arrived). */
  progress: number;
}

export default function HailMap({ step, color, progress }: HailMapProps) {
  // Ease the jeepney toward each step's target instead of jumping to it.
  const [p, setP] = useState(progress);
  const from = useRef(progress);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = progress;
      const id = requestAnimationFrame(() => setP(progress));
      return () => cancelAnimationFrame(id);
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min((now - t0) / 800, 1);
      const v = start + (progress - start) * (1 - Math.pow(1 - k, 3));
      from.current = v;
      setP(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  const bus = useMemo(() => pointAt(START_D + p * (HAIL_D - START_D)), [p]);
  const trail = useMemo<LatLng[]>(
    () => [...ROUTE_COORDS.slice(BUS_START_IDX, bus.index + 1), bus.point],
    [bus]
  );
  const busIcon = useMemo(() => createJeepneyIcon("AVAILABLE", step >= 2), [step]);
  const hail = useMemo(() => hailIcon(color, step), [color, step]);

  return (
    <div className="absolute inset-0 z-0" aria-hidden>
      <MapContainer
        center={HAIL_POINT}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        style={{ width: "100%", height: "100%", background: "#050F1A" }}
      >
        <FrameDrive />
        <TileLayer url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`} />

        {/* Same two-stroke route line as the commuter map */}
        <Polyline positions={ROUTE_COORDS} pathOptions={{ color: "#62A0EA", weight: 8, opacity: 0.2, lineCap: "round", lineJoin: "round" }} />
        <Polyline positions={ROUTE_COORDS} pathOptions={{ color: "#62A0EA", weight: 4, opacity: 0.9, dashArray: "10 10", lineCap: "round", lineJoin: "round" }} />

        {/* Ground the jeepney has covered on its way to the hail point */}
        {step >= 1 && p > 0 && (
          <Polyline positions={trail} pathOptions={{ color, weight: 5, opacity: 1, lineCap: "round", lineJoin: "round" }} />
        )}

        <Marker position={HAIL_POINT} icon={hail} interactive={false} zIndexOffset={200} />
        {step >= 1 && <Marker position={bus.point} icon={busIcon} interactive={false} zIndexOffset={400} />}
      </MapContainer>
    </div>
  );
}
