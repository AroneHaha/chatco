"use client";

import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";
import { useConductorLocationBroadcast } from "@/app/(conductor)/hooks/use-conductor-location-broadcast";

/**
 * Headless component mounted in the conductor layout. While the conductor has
 * an active shift, it broadcasts their GPS to the backend so the vehicle shows
 * (and moves) on the commuter map. Lives in the layout so broadcasting
 * continues across all conductor tabs, not just the dashboard.
 */
export default function ConductorLocationBroadcaster() {
  const { shift } = useConductorShift();
  useConductorLocationBroadcast(Boolean(shift?.shiftId));
  return null;
}
