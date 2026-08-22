"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionStatus } from "laravel-echo";
import { getEcho } from "@/lib/echo";
import { fetchActiveHails, type ConductorHailRequest } from "@/lib/conductor/services/hails.service";

interface UseConductorHailsResult {
  hails: ConductorHailRequest[];
  status: "loading" | "success" | "error" | "empty";
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConductorHails(
  vehicleId?: string,
  pollMs = 10000
): UseConductorHailsResult {
  const [hails, setHails] = useState<ConductorHailRequest[]>([]);
  const [status, setStatus] = useState<UseConductorHailsResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const request = (async () => {
      try {
        const { hails: fetchedHails, error: fetchError } = await fetchActiveHails();
        setHails(fetchedHails);
        setError(fetchError);
        setStatus(
          fetchError ? "error" : fetchedHails.length > 0 ? "success" : "empty"
        );
      } catch (err) {
        setHails([]);
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unable to load hail requests.");
      } finally {
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    void refresh();

    let isSocketConnected = false;
    let unsubscribeConnectionChange: (() => void) | null = null;
    let echo: ReturnType<typeof getEcho> | null = null;
    const channelName = vehicleId ? `vehicle.${vehicleId}.hails` : null;

    const interval = window.setInterval(() => {
      if (!isSocketConnected && document.visibilityState === "visible") {
        void refresh();
      }
    }, pollMs);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const refreshNow = () => void refresh();

    window.addEventListener("focus", refreshNow);
    window.addEventListener("online", refreshNow);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    if (channelName) {
      try {
        echo = getEcho();
        isSocketConnected = echo.connector.connectionStatus() === "connected";
        unsubscribeConnectionChange = echo.connector.onConnectionChange(
          (connectionStatus: ConnectionStatus) => {
            isSocketConnected = connectionStatus === "connected";
          }
        );
        echo
          .private(channelName)
          .listen(".HailCreated", refreshNow)
          .listen(".HailStatusChanged", refreshNow);
      } catch (subscriptionError) {
        console.warn("Hail realtime unavailable; using polling fallback:", subscriptionError);
      }
    }

    return () => {
      window.clearInterval(interval);
      unsubscribeConnectionChange?.();
      window.removeEventListener("focus", refreshNow);
      window.removeEventListener("online", refreshNow);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      if (echo && channelName) echo.leave(channelName);
    };
  }, [pollMs, refresh, vehicleId]);

  return { hails, status, error, refresh };
}
