"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, CarFront, MapPin, Navigation, RefreshCw, Star, Users, X } from "lucide-react";
import { CommuterAvatar } from "@/components/commuter/commuter-avatar";
import type { GpsStatus } from "@/lib/shared/geo/nearby-detector";
import { formatDistance, haversineMeters } from "@/lib/utils/geo";
import { fetchUnitDetails, type CommuterUnitDetails, type UnitCrewDetails } from "@/lib/commuter/services/vehicle-details.service";
import type { MapVehicle } from "./use-commuter-tracking";
import { getCapacityConfig } from "./commuter-map-icons";
import { tripLabel } from "@/lib/shared/map/trip-direction";

interface UnitDetailsPanelProps {
  vehicleId: string;
  vehicle: MapVehicle | null;
  commuterLocation: [number, number] | null;
  gpsStatus: GpsStatus;
  onClose: () => void;
  /** Re-syncs the map's vehicle list after the server reports this unit gone. */
  onUnavailable: () => void;
}

function CrewCard({ role, crew }: { role: string; crew: UnitCrewDetails | null }) {
  const rating = crew?.average_rating;
  return (
    <article className="rounded-2xl border border-white/10 bg-[#102844] p-4 light:border-gray-200 light:bg-[#F8FAFC]">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#62A0EA] light:text-[#1A5FB4]">{role}</div>
      {crew ? <>
        <div className="flex items-center gap-3">
          <CommuterAvatar src={crew.photo_url} className="size-14" iconClassName="size-7" sizes="56px" />
          <div className="min-w-0">
            <h4 className="break-words text-sm font-semibold leading-snug text-white light:text-gray-900">{crew.name}</h4>
            <p className="mt-1 text-xs text-slate-400 light:text-gray-500">Current shift</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.06] pt-3 light:border-gray-200">
          <div className="flex gap-0.5 text-[#62A0EA] light:text-[#1A5FB4]" aria-label={rating == null ? "No ratings yet" : `${rating.toFixed(1)} out of 5 stars`}>
            {[0, 1, 2, 3, 4].map(index => <span key={index} className="relative size-3.5" aria-hidden="true">
              <Star className="absolute size-3.5 text-slate-600 light:text-gray-300" />
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, (rating ?? 0) - index)) * 100}%` }}>
                <Star className="size-3.5 fill-current" />
              </span>
            </span>)}
          </div>
          <span className="text-xs font-semibold text-slate-200 light:text-gray-800">{rating == null ? "No ratings yet" : `${rating.toFixed(1)} / 5`}</span>
          {crew.rating_count > 0 && <span className="text-[11px] text-slate-400 light:text-gray-500">({crew.rating_count} {crew.rating_count === 1 ? "review" : "reviews"})</span>}
        </div>
      </> : <p className="text-sm text-slate-400 light:text-gray-500">{role} details unavailable.</p>}
    </article>
  );
}

export default function UnitDetailsPanel({ vehicleId, vehicle, commuterLocation, gpsStatus, onClose, onUnavailable }: UnitDetailsPanelProps) {
  const [details, setDetails] = useState<CommuterUnitDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(Date.now);
  // The server stops returning this unit (404) once it goes on break or its
  // shift ends, which can be before the map's next vehicle-list refresh.
  const [unavailable, setUnavailable] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // The panel follows its marker: it closes when the unit leaves the live map
  // (break, end of shift, 10 min without GPS). Otherwise only the close
  // control (or Escape) closes it.
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
        setUnavailable(!nextDetails);
        setDetails(nextDetails);
        setError(null);
        // Refresh the map so the marker, and with it this panel, go away
        // together instead of the panel outliving its unit.
        if (!nextDetails) onUnavailable();
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
  }, [vehicleId, retry, onUnavailable]);

  if (!vehicle) return null;

  const distance = !unavailable && commuterLocation && gpsStatus === "available"
    ? haversineMeters(commuterLocation[0], commuterLocation[1], vehicle.lat, vehicle.lng) : null;
  const hasFreshLocation = details?.location_updated_at != null
    && now - Date.parse(details.location_updated_at) < 10 * 60_000;
  const capacity = getCapacityConfig(vehicle.capacity);
  const status = unavailable ? "Not on the live map" : !hasFreshLocation && details ? "Location outdated" : capacity.label;
  const pickupMessage = unavailable ? "This unit has left the live map. It may be on break or has ended its shift."
    : details && !hasFreshLocation ? "Waiting for a fresh GPS location from this unit."
    : vehicle.capacity === "FULL" ? "This unit is full and is not accepting passengers."
    : distance === null ? "Enable your location to see distance."
    : distance > 1000 ? "Outside the 1 km pickup radius."
    : vehicle.capacity === "STANDING" ? "Standing passengers only. Check with the conductor before boarding."
    : "Seats available. This unit is within your pickup radius.";

  return (
    <aside role="dialog" aria-modal="false" aria-labelledby="commuter-unit-title" className="absolute bottom-4 left-4 top-4 z-[1100] hidden w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#071A2E] shadow-2xl shadow-black/40 light:border-gray-200 light:bg-white light:shadow-black/10 lg:flex xl:bottom-28 xl:top-28 xl:w-[22rem]" style={{ touchAction: "pan-y" }}>
      <header className="flex shrink-0 items-start gap-3 border-b border-white/10 px-5 py-4 light:border-gray-200">
        <CarFront size={28} aria-hidden="true" className="mt-0.5 shrink-0 text-[#62A0EA] light:text-[#1A5FB4]" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 light:text-gray-500">Unit details</p>
          <h2 id="commuter-unit-title" className="mt-1 break-words text-lg font-semibold leading-tight text-white light:text-gray-900">{details ? `Unit ${details.unit_number}` : vehicle.plateNumber}</h2>
          {details && <p className="mt-1 text-xs text-slate-400 light:text-gray-500">{details.plate_number}</p>}
        </div>
        <button ref={closeRef} onClick={onClose} aria-label="Close unit details" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-[#102844] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] light:text-gray-500 light:hover:bg-gray-100 light:hover:text-gray-900 light:focus-visible:outline-[#1A5FB4]"><X size={18} /></button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
        <section aria-label="Live unit status">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#102844] p-3.5 light:border-gray-200 light:bg-[#F8FAFC]">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 light:text-gray-500"><Activity size={13} className="text-[#62A0EA] light:text-[#1A5FB4]" />Status</div>
              <p className="mt-2 text-sm font-semibold leading-snug text-white light:text-gray-900">{status}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#102844] p-3.5 light:border-gray-200 light:bg-[#F8FAFC]">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 light:text-gray-500"><Navigation size={13} className="text-[#62A0EA] light:text-[#1A5FB4]" />Distance to you</div>
              <p className="mt-2 text-sm font-semibold leading-snug text-white light:text-gray-900">{distance !== null && hasFreshLocation ? formatDistance(distance) : "—"}</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400 light:text-gray-500">{pickupMessage}</p>
        </section>

        <section aria-labelledby="commuter-unit-route" className="rounded-2xl border border-white/10 p-4 light:border-gray-200">
          <h3 id="commuter-unit-route" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 light:text-gray-500"><MapPin size={14} className="text-[#62A0EA] light:text-[#1A5FB4]" />Route &amp; vehicle</h3>
          <p className="mt-3 break-words text-sm font-medium leading-relaxed text-white light:text-gray-900">{tripLabel(vehicle.tripDirection)}</p>
          <p className="mt-0.5 break-words text-xs text-slate-400 light:text-gray-500">{vehicle.routeName ?? details?.route_name ?? "Route unavailable"}</p>
          {details && <dl className="mt-3 space-y-2 border-t border-white/[0.06] pt-3 text-xs light:border-gray-200">
            <div className="flex justify-between gap-3"><dt className="text-slate-400 light:text-gray-500">Plate number</dt><dd className="text-right font-medium text-slate-200 light:text-gray-800">{details.plate_number}</dd></div>
          </dl>}
        </section>

        <section aria-labelledby="commuter-unit-crew" className="space-y-3">
          <h3 id="commuter-unit-crew" className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 light:text-gray-500"><Users size={14} className="text-[#62A0EA] light:text-[#1A5FB4]" />Your crew</h3>
          {unavailable && !error && <p className="rounded-2xl border border-white/10 p-4 text-sm text-slate-400 light:border-gray-200 light:text-gray-500">Crew details are unavailable while this unit is off the live map.</p>}
          {loading && !details && !unavailable && <div role="status" className="rounded-2xl border border-white/10 p-4 text-sm text-slate-400 light:border-gray-200 light:text-gray-500">Loading crew details…</div>}
          {error && <div role="alert" className="rounded-2xl border border-white/10 p-4 light:border-gray-200">
            <p className="text-sm leading-relaxed text-slate-300 light:text-gray-700">{error}</p>
            <button onClick={() => { setLoading(true); setError(null); setRetry(value => value + 1); }} className="mt-3 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-[#62A0EA] hover:bg-[#102844] light:text-[#1A5FB4] light:hover:bg-gray-100"><RefreshCw size={13} />Try again</button>
          </div>}
          {details && <><CrewCard role="Driver" crew={details.driver} /><CrewCard role="Conductor" crew={details.conductor} /></>}
        </section>
      </div>

      <footer className="shrink-0 border-t border-white/10 px-5 py-3 text-[10px] leading-relaxed text-slate-500 light:border-gray-200 light:text-gray-500">Ratings come from commuter feedback.</footer>
    </aside>
  );
}
