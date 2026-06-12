export function EndOfDaySkeleton() {
  return (
    <div className="min-h-screen bg-[#050F1A] pb-28 animate-pulse">
      <div className="sticky top-0 z-20 bg-[#050F1A]/90 border-b border-white/5 px-4 py-3.5">
        <div className="h-6 w-40 bg-white/[0.06] rounded" />
      </div>
      <div className="px-4 pt-5 space-y-5">
        <div className="h-20 bg-white/[0.04] rounded-2xl" />
        <div className="h-28 bg-white/[0.04] rounded-2xl" />
        <div className="h-48 bg-white/[0.04] rounded-2xl" />
        <div className="h-32 bg-white/[0.04] rounded-2xl" />
        <div className="h-14 bg-white/[0.04] rounded-2xl" />
      </div>
    </div>
  );
}
