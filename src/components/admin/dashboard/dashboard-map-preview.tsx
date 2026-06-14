// components/admin/dashboard/dashboard-map-preview.tsx
// Live map preview section — extracted from admin-dashboard/page.tsx

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { SkeletonMap } from "@/components/admin/ui/skeleton";

const AdminCommuterMap = dynamic(() => import("@/components/admin/admin-commuter-map"), {
  ssr: false,
  loading: () => <SkeletonMap height="100%" label="Live Map Loading…" />,
});

export function DashboardMapPreview() {
  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-1 h-[380px] flex flex-col">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#62A0EA]" /> Live Monitoring
        </h3>
        <Link href="/monitoring" className="text-xs text-[#62A0EA] hover:underline">View Full Map</Link>
      </div>
      <div className="flex-1 rounded-md overflow-hidden border border-[#162033] mx-1 mb-1">
        <AdminCommuterMap isDesktop={false} />
      </div>
    </div>
  );
}
