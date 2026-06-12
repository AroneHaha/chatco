// app/(commuter)/dashboard/use-dashboard.ts
// Dashboard hook — extracts modal state & commuter profile logic.
//
// ARCHITECTURE NOTE:
// GPS tracking, conductor-radius validation, and ETA computation are
// handled inside CommuterMap — the map has direct access to Leaflet's
// location API and vehicle simulation state. The map communicates
// results upward via the onNearbyVehiclesChange callback.
//
// This hook does NOT duplicate GPS tracking. The previous version ran
// a separate navigator.geolocation.watchPosition here, which:
//   1. Duplicated the map's GPS tracking (wasted resources)
//   2. Couldn't access vehicle positions (only map has them)
//   3. Hardcoded setCanHail(true) regardless of radius
// All of that has been removed. canHail and nearbyVehicles are now
// received from the map component via the page callback.

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getCommuterTypeLabel } from "@/types";
import type { NearbyVehicle, GpsStatus } from "@/lib/shared/geo/nearby-detector";

export function useDashboard() {
  const searchParams = useSearchParams();
  const { commuterProfile, isLoading: authLoading } = useAuth();

  // Modal visibility
  const [showScan, setShowScan] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareRide, setShowShareRide] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

  // Hail state
  const [isHailing, setIsHailing] = useState(false);

  // Conductor-radius tracking — populated by CommuterMap via callback
  const [nearbyVehicles, setNearbyVehicles] = useState<NearbyVehicle[]>([]);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("loading");

  // canHail requires BOTH: GPS available AND commuter within conductor radius
  const canHail = gpsStatus === "available" && nearbyVehicles.length > 0;
  const nearestVehicle = canHail ? nearbyVehicles[0] : null;

  // Bottom sheet
  const [showSheet, setShowSheet] = useState(true);

  // Auto-open modals when navigating via nav tabs
  useEffect(() => {
    if (searchParams.get("scan") === "true") {
      setShowScan(true);
    }
    if (searchParams.get("share-ride") === "true") {
      setShowShareRide(true);
    }
  }, [searchParams]);

  // Callback for CommuterMap to push tracking results upward
  const handleNearbyVehiclesChange = useCallback(
    (vehicles: NearbyVehicle[], status: GpsStatus) => {
      setNearbyVehicles(vehicles);
      setGpsStatus(status);
    },
    []
  );

  // Hail handler with conductor-radius check
  const handleHail = useCallback(() => {
    if (!isHailing && !canHail) return;
    setIsHailing((prev) => !prev);
  }, [canHail, isHailing]);

  // Derived values from auth context
  const user = commuterProfile
    ? {
        id: commuterProfile.id,
        firstName: commuterProfile.firstName,
        surname: commuterProfile.surname,
        commuterType: commuterProfile.commuterType,
      }
    : null;

  const commuterTypeLabel = user
    ? getCommuterTypeLabel(user.commuterType)
    : "";
  const commuterName = user
    ? `${user.firstName} ${user.surname}`
    : "";

  return {
    // Auth
    user,
    authLoading,
    commuterTypeLabel,
    commuterName,

    // Modals
    showScan, setShowScan,
    showHistory, setShowHistory,
    showShareRide, setShowShareRide,
    showSOS, setShowSOS,

    // Conductor-radius tracking (from map)
    nearbyVehicles,
    gpsStatus,
    canHail,
    nearestVehicle,
    handleNearbyVehiclesChange,

    // Hail (with conductor-radius restriction)
    isHailing,
    handleHail,

    // Bottom sheet
    showSheet, setShowSheet,
  };
}