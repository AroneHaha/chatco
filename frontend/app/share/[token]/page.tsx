"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Clock, AlertCircle, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import the admin map (it supports liveVehicles markers + is SSR-disabled)
const TrackingMap = dynamic<{
  liveVehicles?: import("@/components/admin/admin-commuter-map").LiveVehicleMarker[];
  sosLocations?: [number, number][];
}>(() => import("@/components/admin/admin-commuter-map"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#050F1A] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#62A0EA] animate-spin" /></div>,
});

interface TrackingData {
  active: boolean;
  expired: boolean;
  commuter_name: string;
  lat: number | null;
  lng: number | null;
  last_updated: string | null;
  expires_at: string;
}

export default function ShareTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          if (res.status === 404) {
            setError("This tracking link was not found.");
          } else {
            setError("Failed to load tracking data.");
          }
          setIsLoading(false);
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }
        const json = await res.json();
        setData(json.data);
        setIsLoading(false);

        // If expired or inactive, stop polling
        if (json.data?.expired || !json.data?.active) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Network error — keep trying
      }
    };

    void fetchData();
    // Poll every 5 seconds for live updates
    pollRef.current = setInterval(fetchData, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
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
      <div className="min-h-screen bg-[#050F1A] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-white font-bold text-lg mb-2">Tracking Unavailable</h1>
          <p className="text-white/40 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (data?.expired || !data?.active) {
    return (
      <div className="min-h-screen bg-[#050F1A] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <Clock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h1 className="text-white font-bold text-lg mb-2">Link Expired</h1>
          <p className="text-white/40 text-sm">
            This tracking link has expired or been deactivated by {data?.commuter_name ?? "the commuter"}.
          </p>
        </div>
      </div>
    );
  }

  // Live tracking view with real map
  const hasPosition = data?.lat != null && data?.lng != null;

  // Build the LiveVehicleMarker for the admin map component.
  // The commuter shows as a "vehicle" on the map so we can reuse the
  // existing map infrastructure (Leaflet + react-leaflet).
  const liveMarkers = hasPosition
    ? [{
        id: "shared-ride",
        unit_number: data?.commuter_name ?? "Commuter",
        plate_number: "",
        lat: data!.lat!,
        lng: data!.lng!,
        speed: 0,
        capacity: "AVAILABLE" as const,
        route_name: "Live Location",
        driver_name: data?.commuter_name ?? "",
        conductor_name: "",
        is_stale: false,
        minutes_since_update: 0,
      }]
    : [];

  return (
    <div className="min-h-screen bg-[#050F1A] flex flex-col">
      {/* Header */}
      <div className="bg-[#071A2E] border-b border-white/[0.06] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-bold text-sm">
            {data?.commuter_name?.charAt(0) ?? "C"}
          </div>
          <div>
            <p className="text-white font-bold text-sm">{data?.commuter_name ?? "Commuter"}</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Live</span>
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
          <TrackingMap liveVehicles={liveMarkers} sosLocations={[]} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20">
            <MapPin className="w-12 h-12 text-white/10" />
            <p className="text-white/40 text-sm">Waiting for GPS data…</p>
            <p className="text-white/20 text-xs">The commuter needs to allow location access.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-[#071A2E] border-t border-white/[0.06] p-3 text-center flex-shrink-0">
        <p className="text-[10px] text-white/20">
          Powered by CHATCO · Updates every 3 seconds · This link expires automatically
        </p>
      </div>
    </div>
  );
}
