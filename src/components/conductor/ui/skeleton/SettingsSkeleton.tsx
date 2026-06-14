export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-[#050F1A] pb-24 lg:pb-8 lg:pl-64 animate-pulse">
      <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-white/[0.06] rounded" />
          <div className="h-4 w-56 bg-white/[0.04] rounded" />
        </div>
        {[1, 2, 3].map((item) => (
          <div key={item} className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-6 h-36" />
        ))}
      </div>
    </div>
  );
}
