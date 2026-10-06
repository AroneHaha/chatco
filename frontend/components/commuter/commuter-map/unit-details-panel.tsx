"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CarFront, Clock3, MapPin, Navigation, RefreshCw, Star, Users, X } from "lucide-react";
import { estimateArrival, type GpsStatus } from "@/lib/shared/geo/nearby-detector";
import { formatDistance, haversineMeters } from "@/lib/utils/geo";
import { fetchUnitDetails, type CommuterUnitDetails, type UnitCrewDetails } from "@/lib/commuter/services/vehicle-details.service";
import type { MapVehicle } from "./use-commuter-tracking";
import { getCapacityConfig } from "./commuter-map-icons";

interface UnitDetailsPanelProps {
  vehicleId: string;
  vehicle: MapVehicle | null;
  commuterLocation: [number, number] | null;
  gpsStatus: GpsStatus;
  onClose: () => void;
}

function CrewPhoto({ crew }: { crew: UnitCrewDetails }) {
  const [failed, setFailed] = useState(false);
  const initials = crew.name.split(/\s+/).filter(Boolean).slice(0, 2).map(name => name[0]).join("").toUpperCase();
  return (
    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-lg font-semibold text-[#9CC5F7]">
      {crew.photo_url && !failed
        ? <Image src={crew.photo_url} alt={crew.name} width={56} height={56} unoptimized onError={() => setFailed(true)} className="size-full object-cover" />
        : <span aria-label={`${crew.name}, no profile photo`}>{initials || "?"}</span>}
    </div>
  );
}

function CrewCard({ role, crew }: { role: string; crew: UnitCrewDetails | null }) {
  const rating = crew?.average_rating;
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#62A0EA]">{role}</div>
      {crew ? <>
        <div className="flex items-center gap-3">
          <CrewPhoto key={crew.photo_url} crew={crew} />
          <div className="min-w-0">
            <h4 className="break-words text-sm font-semibold leading-snug text-white">{crew.name}</h4>
            <p className="mt-1 text-xs text-slate-400">Current shift</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.06] pt-3">
          <div className="flex gap-0.5 text-[#62A0EA]" aria-label={rating == null ? "No ratings yet" : `${rating.toFixed(1)} out of 5 stars`}>
            {[0, 1, 2, 3, 4].map(index => <span key={index} className="relative size-3.5" aria-hidden="true">
              <Star className="absolute size-3.5 text-slate-600" />
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, (rating ?? 0) - index)) * 100}%` }}>
                <Star className="size-3.5 fill-current" />
              </span>
            </span>)}
          </div>
          <span className="text-xs font-semibold text-slate-200">{rating == null ? "No ratings yet" : `${rating.toFixed(1)} / 5`}</span>
          {crew.rating_count > 0 && <span className="text-[11px] text-slate-400">({crew.rating_count} {crew.rating_count === 1 ? "review" : "reviews"})</span>}
        </div>
      </> : <p className="text-sm text-slate-400">{role} details unavailable.</p>}
    </article>
  );
}

export default function UnitDetailsPanel({ vehicleId, vehicle, commuterLocation, gpsStatus, onClose }: UnitDetailsPanelProps) {
  const [details, setDetails] = useState<CommuterUnitDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(Date.now);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!vehicle) onClose();
  }, [vehicle, onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const nextDetails = await fetchUnitDetails(vehicleId, controller.signal);
        if (controller.signal.aborted) return;
        if (!nextDetails) {
          onClose();
          return;
        }
        setDetails(nextDetails);
        setError(null);
      } catch (cause) {
        if (controller.signal.aborted) return;
        // Don't leave a previous shift's crew visible after the unit goes offline.
        setDetails(null);
        setError(cause instanceof Error ? cause.message : "Unable to load unit details.");
      } finally {
        pending = false;
        if (!controller.signal.aborted) {
          setLoading(false);
          setNow(Date.now());
        }
      }
    };
    void load();
    const interval = window.setInterval(() => { setNow(Date.now()); void load(); }, 20_000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [vehicleId, retry, onClose]);

  if (!vehicle) return null;

  const distance = vehicle && commuterLocation && gpsStatus === "available"
    ? haversineMeters(commuterLocation[0], commuterLocation[1], vehicle.lat, vehicle.lng) : null;
  const hasFreshLocation = details?.location_updated_at != null
    && now - Date.parse(details.location_updated_at) < 10 * 60_000;
  const canEstimate = details && hasFreshLocation && vehicle.capacity !== "FULL" && distance !== null && distance <= 1000;
  const eta = canEstimate ? estimateArrival(distance) : null;
  const capacity = getCapacityConfig(vehicle.capacity);
  const status = !hasFreshLocation && details ? "Location outdated" : capacity.label;
  const statusStyles = !hasFreshLocation && details
    ? "border-slate-500/30 bg-slate-500/10 text-slate-300"
    : `${capacity.twBorder} ${capacity.twBg} ${capacity.twText}`;
  const pickupMessage = details && !hasFreshLocation ? "Waiting for a fresh GPS location from this unit."
    : vehicle.capacity === "FULL" ? "This unit is full and is not accepting passengers."
    : distance === null ? "Enable your location to see distance and pickup ETA."
    : distance > 1000 ? "Outside the 1 km pickup radius. ETA becomes available when the unit is closer."
    : vehicle.capacity === "STANDING" ? "Standing passengers only. Check with the conductor before boarding."
    : "Seats available. This unit is within your pickup radius.";

  return (
    <aside role="dialog" aria-modal="false" aria-labelledby="commuter-unit-title" className="absolute bottom-4 left-4 top-4 z-[1100] hidden w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#071A2E]/95 shadow-2xl shadow-black/40 backdrop-blur-xl lg:flex xl:bottom-28 xl:top-28 xl:w-[22rem]" style={{ touchAction: "pan-y" }}>
      <header className="flex shrink-0 items-start gap-3 border-b border-white/10 px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#62A0EA]"><CarFront size={20} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Unit details</p>
          <h2 id="commuter-unit-title" className="mt-1 break-words text-lg font-semibold leading-tight text-white">{details ? `Unit ${details.unit_number}` : vehicle?.plateNumber ?? "Selected unit"}</h2>
          {details && <p className="mt-1 text-xs text-slate-400">{details.plate_number}</p>}
        </div>
        <button ref={closeRef} onClick={onClose} aria-label="Close unit details" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA]"><X size={18} /></button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
        <section aria-label="Live unit status">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${statusStyles}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#62A0EA]/15 bg-[#62A0EA]/[0.06] p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><Clock3 size={13} className="text-[#62A0EA]" />Pickup ETA</div>
              <p className="mt-2 text-xl font-semibold text-white">{eta !== null ? `~${eta}` : "—"}{eta !== null && <span className="ml-1 text-xs font-normal text-slate-400">min</span>}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><Navigation size={13} className="text-[#62A0EA]" />Distance to you</div>
              <p className="mt-2 text-xl font-semibold text-white">{distance !== null && hasFreshLocation ? formatDistance(distance) : "—"}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">{pickupMessage}</p>
        </section>

        <section aria-labelledby="commuter-unit-route" className="rounded-2xl border border-white/10 p-4">
          <h3 id="commuter-unit-route" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"><MapPin size={14} className="text-[#62A0EA]" />Route &amp; vehicle</h3>
          <p className="mt-3 break-words text-sm font-medium leading-relaxed text-white">{vehicle?.routeName ?? details?.route_name ?? "Route unavailable"}</p>
          {details && <dl className="mt-3 space-y-2 border-t border-white/[0.06] pt-3 text-xs">
            <div className="flex justify-between gap-3"><dt className="text-slate-400">Plate number</dt><dd className="text-right font-medium text-slate-200">{details.plate_number}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-400">Vehicle type</dt><dd className="text-right capitalize text-slate-200">{details.vehicle_type.toLowerCase().replaceAll("_", " ")}</dd></div>
          </dl>}
        </section>

        <section aria-labelledby="commuter-unit-crew" className="space-y-3">
          <h3 id="commuter-unit-crew" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"><Users size={14} className="text-[#62A0EA]" />Your crew</h3>
          {loading && !details && <div role="status" className="rounded-2xl border border-white/10 p-4 text-sm text-slate-400">Loading crew details…</div>}
          {error && <div role="alert" className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm leading-relaxed text-slate-300">{error}</p>
            <button onClick={() => { setLoading(true); setError(null); setRetry(value => value + 1); }} className="mt-3 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#62A0EA] hover:bg-[#62A0EA]/10"><RefreshCw size={13} />Try again</button>
          </div>}
          {details && <><CrewCard role="Driver" crew={details.driver} /><CrewCard role="Conductor" crew={details.conductor} /></>}
        </section>
      </div>

      <footer className="shrink-0 border-t border-white/10 px-5 py-3 text-[10px] leading-relaxed text-slate-500">ETA uses GPS distance at an estimated 25 km/h. Traffic and stops may affect arrival. Ratings come from commuter feedback.</footer>
    </aside>
  );
}
