// components/admin/ui/skeleton/skeleton-metric.tsx

interface SkeletonMetricProps {
  count?: number;
}

export function SkeletonMetric({ count = 4 }: SkeletonMetricProps) {
  return (
    <div className={`grid gap-4 ${count <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#1A2540] animate-pulse flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="w-20 h-2 rounded bg-[#1A2540] animate-pulse" />
            <div className="w-14 h-5 rounded bg-[#1A2540] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}