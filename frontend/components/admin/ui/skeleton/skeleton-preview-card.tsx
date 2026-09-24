// components/admin/ui/skeleton/skeleton-preview-card.tsx
// Mirrors the card shape used by DashboardPreviewCards (icon+title header,
// "View All" link, N list rows) so the skeleton doesn't just show a blank
// pulsing rectangle where a structured card is about to appear.

interface SkeletonPreviewCardProps {
  rows?: number;
}

export function SkeletonPreviewCard({ rows = 3 }: SkeletonPreviewCardProps) {
  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 flex flex-col animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#1A2540]" />
          <div className="w-20 h-3.5 rounded bg-[#1A2540]" />
        </div>
        <div className="w-14 h-3 rounded bg-[#1A2540]" />
      </div>
      <div className="space-y-3 flex-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between bg-[#0E1628] rounded-md p-2.5">
            <div className="space-y-1.5">
              <div className="w-24 h-3 rounded bg-[#1A2540]" />
              <div className="w-16 h-2.5 rounded bg-[#1A2540]" />
            </div>
            <div className="w-14 h-4 rounded-md bg-[#1A2540]" />
          </div>
        ))}
      </div>
    </div>
  );
}
