export function UnitVerificationSkeleton() {
  return (
    <div className="min-h-screen bg-[#050F1A] flex flex-col">
      <div className="relative flex-1 flex flex-col justify-center px-4 py-10 max-w-md mx-auto w-full animate-pulse">
        <div className="text-center mb-8 space-y-3">
          <div className="h-7 w-32 bg-white/[0.06] rounded-lg mx-auto" />
          <div className="h-3 w-40 bg-white/[0.04] rounded mx-auto" />
        </div>
        <div className="space-y-3">
          <div className="h-5 w-48 bg-white/[0.06] rounded mx-auto" />
          <div className="h-3 w-64 bg-white/[0.04] rounded mx-auto" />
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 h-20"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
