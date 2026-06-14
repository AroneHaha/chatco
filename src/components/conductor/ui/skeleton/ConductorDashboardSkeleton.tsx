export function ConductorDashboardSkeleton() {
  return (
    <div className="relative h-full w-full bg-[#050F1A] animate-pulse">
      <div className="absolute inset-0 bg-[#071A2E]/40" />
      <div className="lg:hidden flex-shrink-0 bg-[#071A2E]/95 border-b border-white/10 p-4 space-y-3">
        <div className="h-4 w-32 bg-white/[0.06] rounded" />
        <div className="h-3 w-48 bg-white/[0.04] rounded" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 bg-white/[0.04] rounded-xl" />
          <div className="h-16 bg-white/[0.04] rounded-xl" />
        </div>
      </div>
      <div className="hidden lg:block absolute top-6 left-6 w-80 space-y-4">
        <div className="h-28 bg-white/[0.05] rounded-2xl" />
        <div className="h-40 bg-white/[0.05] rounded-2xl" />
      </div>
    </div>
  );
}
