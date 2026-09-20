"use client";

import MetricsContent from "@/components/conductor/metrics/metrics-content";

/**
 * Full-page Performance Metrics — kept for phones/tablets (below xl:) and
 * for anyone linking or refreshing directly into this URL. At xl:+,
 * ConductorDock opens the same view as a popover instead
 * (ConductorMetricsModal) so the conductor doesn't navigate away from
 * whatever tab they were on; both shells render the exact same
 * MetricsContent, which owns all of the actual metrics logic.
 */
export default function MetricsPage() {
  return (
    <div className="lg:pl-64 xl:pl-0 min-h-screen bg-[#050F1A] pb-28 lg:pb-8">
      <MetricsContent />
    </div>
  );
}
