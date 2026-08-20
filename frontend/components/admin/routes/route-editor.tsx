"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CirclePlus, GitBranch, ListPlus, Loader2, LocateFixed, MapPin, Plus, Save, Send, Trash2, WandSparkles } from "lucide-react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FarePoint } from "@/lib/admin/services/fare-point.service";
import {
  listRouteVersions,
  previewRoadGeometry,
  publishRoute,
  saveRouteDraft,
  type AdminRoute,
  type RouteCoordinate,
  type RouteVersion,
} from "@/lib/admin/services/route.service";

interface RouteEditorProps {
  route: AdminRoute;
  farePoints: FarePoint[];
  onRouteChanged: () => Promise<void> | void;
  onEditFarePoint?: (pointNumber: number) => void;
}

function numberedIcon(index: number, needsAttention = false) {
  const background = needsAttention ? "#DC2626" : "#1A5FB4";
  const border = needsAttention ? "#FCA5A5" : "#93C5FD";
  return L.divIcon({
    className: "route-editor-marker",
    html: `<div style="width:28px;height:28px;border-radius:999px;background:${background};color:white;border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;box-shadow:0 3px 12px rgba(0,0,0,.45)">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function RouteMapEvents({ onAdd }: { onAdd: (coordinate: RouteCoordinate) => void }) {
  useMapEvents({
    click(event) {
      onAdd([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function FitGeometry({ coordinates, routeId, request }: { coordinates: RouteCoordinate[]; routeId: string; request: number }) {
  const map = useMap();
  const lastFit = useRef<{ routeId: string | null; request: number }>({ routeId: null, request: -1 });

  useEffect(() => {
    const routeChanged = lastFit.current.routeId !== routeId;
    const manuallyRequested = lastFit.current.request !== request;
    if ((routeChanged || manuallyRequested) && coordinates.length >= 2) {
      map.fitBounds(L.latLngBounds(coordinates).pad(0.08), { animate: false });
    }
    if (routeChanged || manuallyRequested) lastFit.current = { routeId, request };
  }, [coordinates, map, request, routeId]);

  return null;
}

function formatVersionDate(value: string | null) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function insertionIndexFor(coordinates: RouteCoordinate[], point: RouteCoordinate) {
  if (coordinates.length < 2) return coordinates.length;

  const latitudeScale = Math.cos((point[0] * Math.PI) / 180);
  const pointX = point[1] * latitudeScale;
  const pointY = point[0];
  let closestIndex = 1;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const startX = coordinates[index][1] * latitudeScale;
    const startY = coordinates[index][0];
    const endX = coordinates[index + 1][1] * latitudeScale;
    const endY = coordinates[index + 1][0];
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    const projection = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared));
    const projectedX = startX + projection * deltaX;
    const projectedY = startY + projection * deltaY;
    const distance = (pointX - projectedX) ** 2 + (pointY - projectedY) ** 2;

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index + 1;
    }
  }

  return closestIndex;
}

export default function RouteEditor({ route, farePoints, onRouteChanged, onEditFarePoint }: RouteEditorProps) {
  const activeGeometry = route.active_version?.geometry ?? [];
  const [waypoints, setWaypoints] = useState<RouteCoordinate[]>([]);
  const [previewGeometry, setPreviewGeometry] = useState<RouteCoordinate[]>([]);
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [versions, setVersions] = useState<RouteVersion[]>([]);
  const [isRouting, setIsRouting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(Boolean(route.draft_version?.geometry?.length));
  const [mapClickMode, setMapClickMode] = useState<"insert" | "append">("insert");
  const [waypointSource, setWaypointSource] = useState<"route" | "fare_points" | "manual">("route");
  const [detourWarnings, setDetourWarnings] = useState<Array<{ from_index: number; to_index: number }>>([]);
  const [fitRequest, setFitRequest] = useState(0);

  useEffect(() => {
    const draft = route.draft_version;
    const nextWaypoints = draft?.waypoints?.length
      ? draft.waypoints
      : route.active_version?.waypoints ?? [];
    const nextGeometry = draft?.geometry?.length
      ? draft.geometry
      : route.active_version?.geometry ?? [];

    setWaypoints(nextWaypoints);
    setPreviewGeometry(nextGeometry);
    setNotes(draft?.notes ?? "");
    setHasSavedDraft(Boolean(draft?.geometry?.length));
    setWaypointSource(draft && !draft.geometry?.length && draft.notes?.includes("Fare Point") ? "fare_points" : "route");
    setDetourWarnings([]);
  }, [route]);

  useEffect(() => {
    setMessage(null);
    setError(null);
  }, [route.id]);

  useEffect(() => {
    void listRouteVersions(route.id)
      .then(setVersions)
      .catch(() => setVersions([]));
  }, [route.id]);

  const displayedGeometry = previewGeometry.length >= 2 ? previewGeometry : activeGeometry;
  const mapCenter = useMemo<L.LatLngTuple>(() => {
    const source = displayedGeometry.length ? displayedGeometry : [[14.82, 120.86] as RouteCoordinate];
    const bounds = L.latLngBounds(source);
    return [bounds.getCenter().lat, bounds.getCenter().lng];
  }, [displayedGeometry]);

  const markDirty = (nextWaypoints: RouteCoordinate[]) => {
    setWaypoints(nextWaypoints);
    setPreviewGeometry(nextWaypoints);
    setHasSavedDraft(false);
    setMessage("Control points changed. Generate the road path, then save the draft.");
    setError(null);
    setDetourWarnings([]);
  };

  const addWaypoint = (coordinate: RouteCoordinate) => {
    setWaypointSource("manual");
    if (mapClickMode === "append" || waypoints.length < 2) {
      markDirty([...waypoints, coordinate]);
      return;
    }

    const next = [...waypoints];
    next.splice(insertionIndexFor(waypoints, coordinate), 0, coordinate);
    markDirty(next);
  };

  const moveWaypoint = (index: number, coordinate: RouteCoordinate) => {
    setWaypointSource("manual");
    const next = [...waypoints];
    next[index] = coordinate;
    markDirty(next);
  };

  const removeWaypoint = (index: number) => {
    setWaypointSource("manual");
    markDirty(waypoints.filter((_, waypointIndex) => waypointIndex !== index));
  };

  const moveWaypointOrder = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= waypoints.length) return;
    const next = [...waypoints];
    setWaypointSource("manual");
    [next[index], next[target]] = [next[target], next[index]];
    markDirty(next);
  };

  const useFarePoints = () => {
    const coordinates = farePoints
      .filter((point) => point.latitude !== null && point.longitude !== null)
      .sort((a, b) => a.point_number - b.point_number)
      .map((point) => [Number(point.latitude), Number(point.longitude)] as RouteCoordinate);

    if (coordinates.length < 2) {
      setError("Add coordinates to at least two Fare Points first.");
      return;
    }
    setMapClickMode("insert");
    markDirty(coordinates);
    setWaypointSource("fare_points");
    setMessage("Point Areas loaded. Generate a smart preview; the live route stays safe if any old pin is misplaced.");
  };

  const useActiveRoute = () => {
    const active = route.active_version;
    if (!active || active.geometry.length < 2) return;
    setWaypoints(active.waypoints.length >= 2 ? active.waypoints : active.geometry);
    setPreviewGeometry(active.geometry);
    setMapClickMode("insert");
    setWaypointSource("route");
    setDetourWarnings([]);
    setHasSavedDraft(false);
    setMessage("Active route loaded as an editable copy.");
    setError(null);
  };

  const generateRoadPath = async () => {
    if (waypoints.length < 2) {
      setError("Add at least two control points.");
      return;
    }
    setIsRouting(true);
    setError(null);
    try {
      const preview = await previewRoadGeometry(waypoints);
      setWaypoints(preview.snapped_waypoints);
      setDetourWarnings(preview.warnings);
      setHasSavedDraft(false);
      if (preview.warnings.length > 0 && waypointSource === "fare_points" && activeGeometry.length >= 2) {
        setPreviewGeometry(activeGeometry);
        setMessage(null);
      } else {
        setPreviewGeometry(preview.geometry);
        setMessage(preview.warnings.length > 0
          ? "Preview generated with possible detours highlighted. Review it before saving."
          : `Road preview generated with ${preview.geometry.length} geometry points. Control points were snapped to nearby roads.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to generate the road path.");
    } finally {
      setIsRouting(false);
    }
  };

  const warningWaypointIndexes = useMemo(() => new Set(
    detourWarnings.flatMap((warning) => [warning.from_index, warning.to_index])
  ), [detourWarnings]);

  const affectedFarePoints = useMemo(() => {
    if (waypointSource !== "fare_points") return [];
    return Array.from(warningWaypointIndexes)
      .map((index) => farePoints[index])
      .filter((point): point is FarePoint => Boolean(point));
  }, [farePoints, warningWaypointIndexes, waypointSource]);

  const saveDraft = async () => {
    if (waypointSource === "fare_points" && detourWarnings.length > 0) {
      setError("Fix the highlighted Point Area locations or keep the current live route before saving.");
      return;
    }
    if (waypoints.length < 2 || previewGeometry.length < 2) {
      setError("Generate a valid route preview before saving.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await saveRouteDraft(route.id, { geometry: previewGeometry, waypoints, notes: notes || null });
      setHasSavedDraft(true);
      await onRouteChanged();
      setVersions(await listRouteVersions(route.id));
      setMessage("Draft saved. The live commuter map has not changed yet.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save the route draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const publish = async () => {
    if (!hasSavedDraft) {
      setError("Save the current draft before publishing.");
      return;
    }
    setIsPublishing(true);
    setError(null);
    try {
      await publishRoute(route.id, {
        effective_until: expiresAt ? new Date(expiresAt).toISOString() : null,
        notes: notes || null,
      });
      const publishedMessage = expiresAt
        ? "Temporary detour published. The previous route will return automatically after expiration."
        : "Route published. Tracking and hailing will update within one minute.";
      setExpiresAt("");
      setHasSavedDraft(false);
      await onRouteChanged();
      setVersions(await listRouteVersions(route.id));
      setMessage(publishedMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to publish the route.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[#62A0EA]/20 bg-[#071A2E] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="text-[#62A0EA]" size={20} />
            <h2 className="font-bold text-white">Published Route Editor</h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-white/45">
            Use Insert Correction to fix a middle street, or Extend Route to add at the end. Drag numbered points to fine-tune. Changes remain drafts until published.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#050F1A] px-4 py-2 text-xs text-white/60">
          <p>Live version: <span className="font-bold text-white">{route.active_version ? `v${route.active_version.number}` : "None"}</span></p>
          <p className="mt-0.5">{route.active_version?.is_temporary ? "Temporary detour active" : "Permanent route"}</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div>}
      {detourWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <p className="text-sm font-bold text-amber-200">
            {waypointSource === "fare_points"
              ? "Some old Point Area pins are misplaced. Your live route was kept unchanged."
              : "The preview contains an unusually long road detour."}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/65">
            {waypointSource === "fare_points"
              ? "You can keep using the safe live route now, then correct these locations through the map picker when convenient."
              : "Check the red control points on the map. If the detour is intentional, you may continue and save the draft."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeGeometry.length >= 2 && (
              <button type="button" onClick={useActiveRoute} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500">
                Keep Current Live Route
              </button>
            )}
            {affectedFarePoints.map((point) => (
              <button
                key={point.id}
                type="button"
                onClick={() => onEditFarePoint?.(point.point_number)}
                className="rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-300/10"
              >
                Fix {point.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* items-stretch (grid's default, made explicit here) + h-full on the
          map: the sidebar's stacked controls run well past the map's old
          fixed 480px, so the map stretches to match the sidebar's actual
          height instead of sitting short beside a much taller column.
          min-h-[480px] keeps a sane floor for the sub-xl single-column
          layout, where the sidebar sits in its own row below the map. */}
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-full min-h-120 overflow-hidden rounded-2xl border border-white/10">
          <MapContainer center={mapCenter} zoom={12} className="h-full w-full" attributionControl>
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {activeGeometry.length >= 2 && (
              <Polyline positions={activeGeometry} pathOptions={{ color: "#64748B", weight: 6, opacity: 0.45 }} />
            )}
            {previewGeometry.length >= 2 && (
              <Polyline positions={previewGeometry} pathOptions={{ color: "#60A5FA", weight: 5, opacity: 0.95 }} />
            )}
            {waypoints.map((coordinate, index) => (
              <Marker
                key={`${index}-${coordinate[0]}-${coordinate[1]}`}
                position={coordinate}
                icon={numberedIcon(index, warningWaypointIndexes.has(index))}
                draggable
                eventHandlers={{
                  dragend(event) {
                    const next = event.target.getLatLng();
                    moveWaypoint(index, [next.lat, next.lng]);
                  },
                }}
              />
            ))}
            <RouteMapEvents onAdd={addWaypoint} />
            <FitGeometry coordinates={displayedGeometry} routeId={route.id} request={fitRequest} />
          </MapContainer>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#050F1A] p-1.5">
            <button
              type="button"
              onClick={() => setMapClickMode("insert")}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition-colors ${mapClickMode === "insert" ? "bg-[#1A5FB4] text-white" : "text-white/45 hover:bg-white/5"}`}
            >
              <ListPlus size={13} /> Insert Correction
            </button>
            <button
              type="button"
              onClick={() => setMapClickMode("append")}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition-colors ${mapClickMode === "append" ? "bg-[#1A5FB4] text-white" : "text-white/45 hover:bg-white/5"}`}
            >
              <Plus size={13} /> Extend Route
            </button>
          </div>
          <p className="px-1 text-[10px] leading-relaxed text-white/35">
            {mapClickMode === "insert"
              ? "Click the intended road near a wrong middle segment. The correction is inserted at the closest part of the route."
              : "Click roads in travel order. Each click is added after the current final point."}
          </p>

          <button type="button" onClick={() => setFitRequest((current) => current + 1)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-white/60 hover:bg-white/5">
            <LocateFixed size={14} /> Fit Entire Route
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={useActiveRoute} disabled={!route.active_version} className="rounded-xl bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/10 disabled:opacity-40">
              Edit Live Route
            </button>
            <button type="button" onClick={useFarePoints} className="rounded-xl bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/10">
              Build from Point Areas
            </button>
          </div>

          <button type="button" onClick={() => { setMapClickMode("append"); setWaypointSource("manual"); markDirty([]); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 px-3 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/10">
            <Trash2 size={14} /> Clear Control Points
          </button>

          <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-[#050F1A] p-2">
            {waypoints.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-white/30">Click the map to add points.</p>
            ) : waypoints.map((coordinate, index) => (
              <div key={`${coordinate[0]}-${coordinate[1]}-list`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1A5FB4] text-[9px] font-bold text-white">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[10px] text-white/50">{coordinate[0].toFixed(6)}, {coordinate[1].toFixed(6)}</span>
                <button type="button" onClick={() => moveWaypointOrder(index, -1)} disabled={index === 0} className="text-white/40 disabled:opacity-20">↑</button>
                <button type="button" onClick={() => moveWaypointOrder(index, 1)} disabled={index === waypoints.length - 1} className="text-white/40 disabled:opacity-20">↓</button>
                <button type="button" onClick={() => removeWaypoint(index)} className="text-red-300/70">×</button>
              </div>
            ))}
          </div>

          <button type="button" onClick={generateRoadPath} disabled={isRouting || waypoints.length < 2} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A5FB4] px-4 py-3 text-sm font-bold text-white hover:bg-[#165a9f] disabled:opacity-40">
            {isRouting ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
            Generate Road Preview
          </button>

          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Reason for reroute or revision" className="w-full rounded-xl border border-white/10 bg-[#050F1A] px-3 py-2 text-xs text-white outline-none focus:border-[#62A0EA]" />

          <button type="button" onClick={saveDraft} disabled={isSaving || previewGeometry.length < 2 || waypoints.length < 2 || (waypointSource === "fare_points" && detourWarnings.length > 0)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#62A0EA]/30 px-4 py-3 text-sm font-bold text-[#93C5FD] hover:bg-[#1A5FB4]/10 disabled:opacity-40">
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Save Draft
          </button>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/35">Optional detour expiration</label>
            <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#050F1A] px-3 py-2.5 text-xs text-white outline-none focus:border-[#62A0EA]" />
          </div>

          <button type="button" onClick={publish} disabled={isPublishing || !hasSavedDraft} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40">
            {isPublishing ? <Loader2 className="animate-spin" size={16} /> : expiresAt ? <CirclePlus size={16} /> : <Send size={16} />}
            {expiresAt ? "Publish Temporary Detour" : "Publish Permanent Route"}
          </button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {versions.slice(0, 3).map((version) => (
          <div key={version.id} className="rounded-xl border border-white/5 bg-[#050F1A]/70 px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">v{version.number}</span>
              <span className={version.status === "PUBLISHED" ? "text-emerald-400" : "text-amber-400"}>{version.status}</span>
            </div>
            <p className="mt-1 truncate text-white/35">{version.notes || "No revision note"}</p>
            <p className="mt-1 text-[10px] text-white/25">{formatVersionDate(version.published_at)}</p>
          </div>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-[10px] text-white/30">
        <MapPin size={12} /> The gray line is live. The blue line is the preview. Publishing updates tracking and route coverage together.
      </p>
    </section>
  );
}
