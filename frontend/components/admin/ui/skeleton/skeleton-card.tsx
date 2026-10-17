// components/admin/ui/skeleton/skeleton-card.tsx

interface SkeletonCardProps {
  count?: number;
  height?: string;
  adminThemed?: boolean;
}

export function SkeletonCard({ count = 1, height = 'h-[140px]', adminThemed = false }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-[#131C2E] ${adminThemed ? 'admin-light:bg-[#EEF2F7] admin-light:border-[#E2E8F0]' : ''} border border-[#1E2D45] rounded-lg p-5 ${height} animate-pulse`}
        />
      ))}
    </>
  );
}
