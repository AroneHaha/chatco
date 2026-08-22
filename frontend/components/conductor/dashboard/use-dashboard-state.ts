"use client";

import { useState, useRef, useCallback } from "react";
import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";
import { useConductorTransactions } from "@/app/(conductor)/hooks/use-conductor-transactions";
import { useConductorHails } from "@/app/(conductor)/hooks/use-conductor-hails";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "@/lib/conductor/persistence/device.store";
import { isOperatingDevice } from "@/lib/conductor/services/shift.service";
import { acceptHail, rejectHail } from "@/lib/conductor/services/hails.service";

export type ConductorStatus = "Available" | "Standing" | "Full";

// UI labels → backend CapacityStatus enum values.
const TO_CAPACITY: Record<ConductorStatus, "AVAILABLE" | "STANDING" | "FULL"> = {
  Available: "AVAILABLE",
  Standing: "STANDING",
  Full: "FULL",
};

export function useDashboardState() {
  const { shift, elapsed, status: shiftStatus, error: shiftError, refresh: refreshShift } =
    useConductorShift();
  const { summary: liveTransactions, status: txnStatus, error: txnError } =
    useConductorTransactions(shift?.shiftId ?? null);
  // Conductor just observes waiting commuters on the map; the commuter drives
  // the hail lifecycle (create + cancel), so no accept/reject action here.
  const { hails, refresh: refreshHails } = useConductorHails(shift?.vehicleId);
  const canOperate = isOperatingDevice(shift);
  const [hailBusyId, setHailBusyId] = useState<string | null>(null);
  const [hailActionError, setHailActionError] = useState<string | null>(null);

  const updateHail = useCallback(async (hailId: string, action: "accept" | "reject") => {
    if (!canOperate || hailBusyId) return;
    setHailBusyId(hailId);
    setHailActionError(null);
    try {
      if (action === "accept") await acceptHail(hailId);
      else await rejectHail(hailId);
      await refreshHails();
    } catch (error) {
      setHailActionError(error instanceof Error ? error.message : "Unable to update the pickup request.");
      await refreshHails();
    } finally {
      setHailBusyId(null);
    }
  }, [canOperate, hailBusyId, refreshHails]);

  const [status, setStatusState] = useState<ConductorStatus>("Available");
  // Mirror of `status` for reading the pre-change value inside setStatus
  // without adding it to the callback's deps (keeps setStatus stable).
  const statusRef = useRef<ConductorStatus>("Available");

  // Persist the conductor's unit capacity to the backend so it recolors the
  // unit on every commuter's map (green / yellow / red). Optimistic: flip the
  // UI immediately, then roll back if the request fails (e.g. no active shift).
  const setStatus = useCallback((next: ConductorStatus) => {
    if (!canOperate) return;
    const prev = statusRef.current;
    if (prev === next) return;

    statusRef.current = next;
    setStatusState(next);

    void (async () => {
      try {
        const res = await fetch(CONDUCTOR_API.capacityStatus, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            capacity_status: TO_CAPACITY[next],
            deviceId: getConductorDeviceId(),
            deviceType: CONDUCTOR_DEVICE_TYPE,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        // Revert the optimistic update — the map still shows the old status.
        statusRef.current = prev;
        setStatusState(prev);
      }
    })();
  }, [canOperate]);

  const [showHistory, setShowHistory] = useState(false);
  const [mobileCardExpanded, setMobileCardExpanded] = useState(true);
  const [breakBusy, setBreakBusy] = useState(false);
  const [breakError, setBreakError] = useState<string | null>(null);
  const [showBreakModal, setShowBreakModal] = useState(false);

  const openBreakModal = useCallback(() => {
    if (!canOperate) return;
    setBreakError(null);
    setShowBreakModal(true);
  }, [canOperate]);

  const closeBreakModal = useCallback(() => {
    if (breakBusy) return;
    setShowBreakModal(false);
  }, [breakBusy]);

  const toggleBreak = useCallback(async () => {
    if (!shift || breakBusy || !canOperate) return;

    setBreakBusy(true);
    setBreakError(null);
    try {
      const res = await fetch(CONDUCTOR_API.breakStatus, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          is_on_break: !shift.isOnBreak,
          deviceId: getConductorDeviceId(),
          deviceType: CONDUCTOR_DEVICE_TYPE,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Unable to update break status (HTTP ${res.status}).`);
      }
      await refreshShift();
      setShowBreakModal(false);
    } catch (error) {
      setBreakError(error instanceof Error ? error.message : "Unable to update break status.");
    } finally {
      setBreakBusy(false);
    }
  }, [breakBusy, canOperate, refreshShift, shift]);

  const conductorName = shift?.conductorName || "—";
  const unitNumber = shift?.unitNumber || "—";
  const route = shift?.route || "—";
  const driverName = shift?.driverName || "—";

  return {
    shift,
    canOperate,
    elapsed,
    shiftStatus,
    shiftError,
    liveTransactions,
    txnStatus,
    txnError,
    hails,
    hailBusyId,
    hailActionError,
    updateHail,
    status,
    setStatus,
    isOnBreak: Boolean(shift?.isOnBreak),
    breakBusy,
    breakError,
    toggleBreak,
    showBreakModal,
    openBreakModal,
    closeBreakModal,
    showHistory,
    setShowHistory,
    mobileCardExpanded,
    setMobileCardExpanded,
    conductorName,
    unitNumber,
    route,
    driverName,
  };
}
