// app/(commuter)/dashboard/use-dashboard.ts
// Dashboard hook — follows the same pattern as use-profile, use-feedback, etc.
// Extracts all state & logic from the dashboard page component.
// Uses auth context for user data instead of hardcoded mockUser.

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getCommuterTypeLabel } from "@/types";

export function useDashboard() {
  const searchParams = useSearchParams();
  const { commuterProfile, isLoading: authLoading } = useAuth();

  // Modal visibility
  const [showQR, setShowQR] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareRide, setShowShareRide] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

  // Hail state
  const [isHailing, setIsHailing] = useState(false);

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
    showQR, setShowQR,
    showScan, setShowScan,
    showHistory, setShowHistory,
    showShareRide, setShowShareRide,
    showSOS, setShowSOS,

    // Hail
    isHailing, setIsHailing,

    // Bottom sheet
    showSheet, setShowSheet,
  };
}
