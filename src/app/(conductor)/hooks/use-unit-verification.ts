"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  fetchConductorProfile,
  fetchDrivers,
  fetchUnits,
  type ConductorDriver,
  type ConductorProfile,
  type ConductorUnit,
} from "@/lib/conductor/services/units.service";

interface UseUnitVerificationResult {
  profile: ConductorProfile | null;
  units: ConductorUnit[];
  drivers: ConductorDriver[];
  status: "loading" | "success" | "error" | "empty";
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUnitVerification(): UseUnitVerificationResult {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ConductorProfile | null>(null);
  const [units, setUnits] = useState<ConductorUnit[]>([]);
  const [drivers, setDrivers] = useState<ConductorDriver[]>([]);
  const [status, setStatus] = useState<UseUnitVerificationResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const [profileResult, unitsResult, driversResult] = await Promise.all([
        fetchConductorProfile(),
        fetchUnits(),
        fetchDrivers(),
      ]);

      const resolvedProfile =
        profileResult.profile ??
        (user
          ? {
              id: user.id,
              name: user.email.split("@")[0] || "Conductor",
            }
          : null);

      setProfile(resolvedProfile);
      setUnits(unitsResult.units);
      setDrivers(driversResult.drivers);

      const errors = [
        profileResult.error,
        unitsResult.error,
        driversResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        setError(errors[0] ?? null);
        setStatus(unitsResult.units.length > 0 ? "success" : "error");
        return;
      }

      setStatus(
        unitsResult.units.length > 0 || driversResult.drivers.length > 0
          ? "success"
          : "empty"
      );
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Unable to load verification data."
      );
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, units, drivers, status, error, refresh };
}
