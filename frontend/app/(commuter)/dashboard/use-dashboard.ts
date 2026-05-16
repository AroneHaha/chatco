// app/(commuter)/dashboard/use-dashboard.ts
// Dashboard hook — follows the same pattern as use-profile, use-feedback, etc.
// Extracts all state & logic from the dashboard page component.
// Uses auth context for user data instead of hardcoded mockUser.
// Includes 1KM proximity check for hail feature.

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getCommuterTypeLabel } from "@/types";

// 1KM radius for hail restriction — commuters can only hail if a vehicle is within this range
const HAIL_RADIUS_KM = 1;

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

  // 1KM proximity — tracks whether any vehicle is within hail range
  const [canHail, setCanHail] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyCount, setNearbyCount] = useState(0);

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

  // Track user location for 1KM hail restriction
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        // Location denied or unavailable — can't determine proximity
        setCanHail(false);
        setNearbyCount(0);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Check 1KM proximity when user location changes
  // This will be replaced by a real API call when backend is live:
  // GET /api/vehicles/nearby?lat=X&lng=Y&radius=1
  useEffect(() => {
    if (!userLocation) {
      setCanHail(false);
      setNearbyCount(0);
      return;
    }

    // TODO: Replace with real API call
    // For now, enable hail if user location is available (proximity check
    // will be enforced server-side when backend is live)
    // The commuter map component also filters by 1KM and shows only nearby vehicles
    setCanHail(true);
    setNearbyCount(0); // Will be populated by real API
  }, [userLocation]);

  // Hail handler with 1KM check
  const handleHail = useCallback(() => {
    if (!canHail) return;
    setIsHailing((prev) => !prev);
  }, [canHail]);

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

    // Hail (with 1KM restriction)
    isHailing,
    setIsHailing,
    canHail,
    nearbyCount,
    handleHail,

    // Bottom sheet
    showSheet, setShowSheet,
  };
}
