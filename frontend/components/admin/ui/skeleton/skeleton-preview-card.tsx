// components/admin/ui/skeleton/skeleton-preview-card.tsx
// Mirrors the dashboard's fleet, timeline and featured-preview compositions.

interface SkeletonPreviewCardProps {
  rows?: number;
  variant?: "fleet" | "timeline" | "featured" | "users";
}

export function SkeletonPreviewCard({ rows = 3, variant = "users" }: SkeletonPreviewCardProps) {
  return (
    <div className="h-full overflow-hidden rounded-lg border border-[#1E2D45] bg-[#131C2E]">
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="w-24 h-3.5 rounded bg-[#1A2540]" />
        <div className="w-14 h-3 rounded bg-[#1A2540]" />
      </div>
      <div className="px-5 py-5">
        {variant === "fleet" && (
          <div className="mb-5 space-y-3 border-b border-[#1E2D45] pb-5">
            <div className="h-12 w-20 rounded bg-[#1A2540]" />
            <div className="h-3 w-40 rounded bg-[#1A2540]" />
          </div>
        )}
        {variant === "featured" && (
          <div className="mb-4 space-y-3 border-b border-[#1E2D45] pb-5">
            <div className="h-2.5 w-24 rounded bg-[#1A2540]" />
            <div className="h-5 w-full rounded bg-[#1A2540]" />
            <div className="h-5 w-2/3 rounded bg-[#1A2540]" />
          </div>
        )}
        {variant === "users" && (
          <div className="mb-4 flex gap-6 border-b border-[#1E2D45] pb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-7 w-6 rounded bg-[#1A2540]" />
                <div className="h-2 w-10 rounded bg-[#1A2540]" />
              </div>
            ))}
          </div>
        )}
        <div className={variant === "fleet" ? "grid grid-cols-1 gap-4 sm:grid-cols-3" : "space-y-4"}>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className={`min-w-0 ${variant === "timeline" ? "grid gap-2 border-l border-[#2A3A55] py-1 pl-5 sm:grid-cols-[minmax(0,1fr)_8rem]" : "space-y-2"}`}>
              <div className="h-3 w-3/4 rounded bg-[#1A2540]" />
              <div className={`h-2.5 w-16 rounded bg-[#1A2540] ${variant === "timeline" ? "sm:justify-self-end" : ""}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
