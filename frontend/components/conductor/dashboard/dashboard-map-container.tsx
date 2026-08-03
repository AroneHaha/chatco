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
}

export function DashboardMapContainer({ unitNumber, hails, status, isOnBreak }: DashboardMapContainerProps) {
  return (
    <div className="fixed inset-0 z-0 lg:left-64">
      <ConductorMap
        unitNumber={unitNumber}
        hails={hails}
        capacityStatus={status}
        isOnBreak={isOnBreak}
      />
    </div>
  );
}
