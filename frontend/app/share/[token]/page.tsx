"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { MapPin, Clock, AlertCircle, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { ReactNode } from "react";
import { UserAvatar } from "@/components/admin/ui/user-avatar";

// Dynamically import the admin map (it supports liveVehicles markers + is SSR-disabled)
const TrackingMap = dynamic<{
  commuters?: import("@/components/admin/admin-commuter-map").CommuterData[];
  liveVehicles?: import("@/components/admin/admin-commuter-map").LiveVehicleMarker[];
  sosLocations?: import("@/components/admin/admin-commuter-map").SosMapMarker[];
  focusPosition?: [number, number] | null;
}>(() => import("@/components/admin/admin-commuter-map"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#050F1A] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#62A0EA] animate-spin" /></div>,
});

/** Full-page state shown instead of the map: link not found, failed, or expired. */
function StatusScreen({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#050F1A] flex flex-col">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.06]">
        <Image src="/logo-transparent.png" alt="" width={28} height={28} className="shrink-0" priority />
        <span className="text-sm font-bold text-white">CHATCO</span>
        <span className="text-xs text-white/40">Share My Ride</span>
      </div>

      <main className="flex-1 flex items-center px-6 py-12">
        <div className="w-full max-w-md mx-auto">
          {icon}
          <h1 className="mt-6 text-2xl font-bold leading-tight tracking-tight text-white">{title}</h1>
          <div className="mt-3 space-y-4 text-sm leading-relaxed text-white/55">{children}</div>
        </div>
      </main>

      <p className="px-5 py-4 text-center text-[10px] text-white/25">Powered by CHATCO</p>
    </div>
  );
}

interface TrackingData {
  active: boolean;
  expired: boolean;
  commuter_name: string;
  /** Only sent while the link is live; null when no photo was uploaded. */
  commuter_profile_image_url?: string | null;
  lat: number | null;
  lng: number | null;
  last_updated: string | null;
  /** Age of the position on the server's clock, so a wrong viewer clock can't hide staleness. */
  seconds_since_update?: number | null;
  expires_at: string;
}

/** Matches the public page's poll; the commuter's device pushes at least every 15s. */
const POLL_MS = 5_000;
/** Past this the position is shown as "last seen", not live. */
const STALE_AFTER_SECONDS = 30;

function formatAge(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
  return "over an hour ago";
}

export default function ShareTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // The map flies to the commuter once; after that the viewer pans freely.
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(null);

  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;

    let stopped = false;
    let inFlight = false;
    let hasData = false;
    const stopPolling = () => {
      stopped = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };

    const fetchData = async () => {
      // Skip while the tab is backgrounded — nothing is visible to update,
      // so there's no point polling. The visibilitychange listener below
      // fires an immediate fetch as soon as the tab is foregrounded again,
      // so the existing 5s cadence while visible is unaffected.
      if (typeof document !== "undefined" && document.hidden) return;
      // A slow response must not stack a second request on top of it.
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (stopped) return;
        if (!res.ok) {
          // Only "not found" is final. A 429/5xx is a blip: keep the last
          // position on screen and try again on the next tick.
          if (res.status === 404) {
            setError("This tracking link was not found.");
            setIsLoading(false);
            stopPolling();
          } else {
            if (!hasData) setError("Failed to load tracking data.");
            setIsLoading(false);
          }
          return;
        }
        const json = await res.json();
        const next: TrackingData | null = json.data ?? null;
        hasData = true;
        setError(null);
        setData(next);
        setIsLoading(false);
        if (next?.lat != null && next?.lng != null) {
          const target: [number, number] = [next.lat, next.lng];
          setFocusTarget(prev => prev ?? target);
        }

        // If expired or inactive, stop polling
        if (!next || next.expired || !next.active) stopPolling();
      } catch {
        // Network error — keep trying
      } finally {
        inFlight = false;
      }
    };

    void fetchData();
    pollRef.current = setInterval(fetchData, POLL_MS);

    // Catch up immediately on returning to the tab instead of waiting up to
    // 5s for the next tick (fetchData no-ops while hidden, above).
    const handleVisibilityChange = () => {
      if (!document.hidden) void fetchData();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token]);

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
      });
    } catch {
      return "—";
    }
  };

  // Live tracking view with real map
  const hasPosition = data?.lat != null && data?.lng != null;
  // The commuter's phone stopped reporting (screen locked, app closed, no signal).
  const isStale = (data?.seconds_since_update ?? 0) > STALE_AFTER_SECONDS;

  // Render the commuter as a single person marker (NOT a vehicle) — the
  // share link is meant to show only the commuter's own live location, never
  // any jeepney units. Using the map's `commuters` prop gives a person pin;
  // `liveVehicles` is left empty so no unit markers appear.
  // Memoized so an unchanged position (e.g. a poll tick with identical
  // lat/lng) doesn't hand the map a brand-new array/object each time —
  // this hook must run unconditionally, so it's declared before the early
  // returns below even though its result is only used in the final render.
  const commuterMarkers = useMemo(
    () =>
      hasPosition
        ? [{
            id: 1,
            name: data?.commuter_name ?? "Commuter",
            latlng: [data!.lat!, data!.lng!] as [number, number],
            locationDetail: "Live shared location",
          }]
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPosition, data?.lat, data?.lng, data?.commuter_name]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050F1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#62A0EA] animate-spin" />
          <p className="text-sm text-white/40">Loading live tracking…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <StatusScreen
        icon={<AlertCircle aria-hidden="true" strokeWidth={1.5} className="w-14 h-14 text-[#F07171]" />}
        title="Tracking unavailable"
      >
        <p>{error}</p>
        <p className="text-white/40">Check that you opened the full link, or ask for a new one.</p>
      </StatusScreen>
    );
  }

  if (data?.expired || !data?.active) {
    return (
      <StatusScreen
        icon={<Clock aria-hidden="true" strokeWidth={1.5} className="w-14 h-14 text-[#62A0EA]" />}
        title="This link has expired"
      >
        <p>
          <span className="font-semibold text-white">{data?.commuter_name ?? "The commuter"}</span> stopped
          sharing their location, or the link reached its time limit.
        </p>
        <p className="border-t border-white/[0.08] pt-4 text-white/40">
          Still need to follow their ride? Ask them to send you a new link.
        </p>
      </StatusScreen>
    );
  }

  return (
    <div className="min-h-screen bg-[#050F1A] flex flex-col">
      {/* Header */}
      <div className="bg-[#071A2E] border-b border-white/[0.06] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Same default person image as the profile photo until one is uploaded. */}
          <UserAvatar
            src={data?.commuter_profile_image_url}
            alt={data?.commuter_name ?? "Commuter"}
            className="h-10 w-10"
            iconClassName="h-5 w-5"
          />
          <div>
            <p className="text-white font-bold text-sm">{data?.commuter_name ?? "Commuter"}</p>
            <div className="flex items-center gap-1.5">
              {isStale ? (
                <span className="text-[11px] text-white/50">
                  Last seen {formatAge(data?.seconds_since_update ?? 0)}
                </span>
              ) : (
                <>
                  <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#62A0EA]" />
                  <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Live</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Last Updated</p>
          <p className="text-xs text-white/60 font-medium">{formatTime(data?.last_updated ?? null)}</p>
        </div>
      </div>

      {/* Live Map */}
      <div className="flex-1 relative min-h-[400px]">
        {hasPosition ? (
          // Absolutely fill the flex area so the Leaflet container gets a
          // definite height. A plain `h-full` collapses to 0 here because the
          // flex parent has no explicit height (only min-h) — the map would
          // render blank between the header and footer.
          <div className="absolute inset-0">
            <TrackingMap commuters={commuterMarkers} liveVehicles={[]} sosLocations={[]} focusPosition={focusTarget} />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <MapPin className="w-12 h-12 text-white/10" />
            <p className="text-white/40 text-sm">Waiting for GPS data…</p>
            <p className="text-white/20 text-xs">The commuter needs to allow location access.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-[#071A2E] border-t border-white/[0.06] p-3 text-center flex-shrink-0">
        <p className="text-[10px] text-white/20">
          Powered by CHATCO · Updates every 5 seconds · This link expires automatically
        </p>
      </div>
    </div>
  );
}
