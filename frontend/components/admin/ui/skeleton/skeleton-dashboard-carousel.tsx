// components/admin/ui/skeleton/skeleton-dashboard-carousel.tsx
// Mirrors DashboardSettingsCarousel's "Quick Links" card (title+subtitle,
// nav buttons, row of module chips) instead of leaving it unrepresented
// while the dashboard loads.

export function SkeletonDashboardCarousel() {
  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-6 animate-pulse">
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <div className="w-24 h-4 rounded bg-[#1A2540]" />
          <div className="w-56 h-3 rounded bg-[#1A2540]" />
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-md bg-[#0E1628] border border-[#1E2D45]" />
          <div className="w-8 h-8 rounded-md bg-[#0E1628] border border-[#1E2D45]" />
        </div>
      </div>

      <div className="flex gap-5 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-70 h-35 rounded-lg p-5 flex flex-col justify-between border border-[#1E2D45] bg-[#0E1628]"
          >
            <div className="w-10 h-10 rounded-lg bg-[#1A2540]" />
            <div className="space-y-2">
              <div className="w-24 h-3.5 rounded bg-[#1A2540]" />
              <div className="w-full h-2.5 rounded bg-[#1A2540]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
