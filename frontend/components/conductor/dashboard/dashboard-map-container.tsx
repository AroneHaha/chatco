"use client";

import dynamic from "next/dynamic";
import type { ConductorHailRequest } from "@/lib/conductor/types";
import type { ConductorStatus } from "./use-dashboard-state";

const ConductorMap = dynamic(() => import("@/components/conductor/conductor-map"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#050F1A]" />,
});

interface DashboardMapContainerProps {
  unitNumber: string;
  hails: ConductorHailRequest[];
  status: ConductorStatus;
  isOnBreak: boolean;
  canOperate: boolean;
  hailBusyId: string | null;
  hailActionError: string | null;
  onHailAction: (hailId: string, action: "accept" | "reject") => void;
}

export function DashboardMapContainer({ unitNumber, hails, status, isOnBreak, canOperate, hailBusyId, hailActionError, onHailAction }: DashboardMapContainerProps) {
  return (
    <div className="fixed inset-0 z-0 lg:left-64">
      <ConductorMap
        unitNumber={unitNumber}
        hails={hails}
        capacityStatus={status}
        isOnBreak={isOnBreak}
        canOperate={canOperate}
        hailBusyId={hailBusyId}
        onHailAction={onHailAction}
      />
      {hailActionError ? (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-[1000] -translate-x-1/2 rounded-lg border border-red-400/30 bg-red-950/90 px-4 py-2 text-xs text-red-200 shadow-xl">
          {hailActionError}
        </div>
      ) : null}
    </div>
  );
}
