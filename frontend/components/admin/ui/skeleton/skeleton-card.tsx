// components/admin/ui/skeleton/skeleton-card.tsx

interface SkeletonCardProps {
  count?: number;
  height?: string;
}

export function SkeletonCard({ count = 1, height = 'h-[140px]' }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 ${height} animate-pulse`} />
      ))}
    </>
  );
}