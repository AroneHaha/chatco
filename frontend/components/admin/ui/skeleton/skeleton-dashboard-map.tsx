// components/admin/ui/skeleton/skeleton-dashboard-map.tsx
// Mirrors DashboardMapPreview's frame (icon+title header, "View Full Map"
// link, map area) instead of a blank pulsing rectangle.

import { SkeletonMap } from "./skeleton-map";

export function SkeletonDashboardMap() {
  return (
    <div className="bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-1 h-[380px] flex flex-col animate-pulse">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#1A2540] admin-light:bg-[#EEF2F7]" />
          <div className="w-28 h-3.5 rounded bg-[#1A2540] admin-light:bg-[#EEF2F7]" />
        </div>
        <div className="w-20 h-3 rounded bg-[#1A2540] admin-light:bg-[#EEF2F7]" />
      </div>
      <div className="flex-1 rounded-md overflow-hidden border border-[#162033] admin-light:border-[#E2E8F0] mx-1 mb-1">
        <SkeletonMap height="100%" />
      </div>
    </div>
  );
}
