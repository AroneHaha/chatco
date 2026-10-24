export function UnitVerificationSkeleton() {
  return (
    <div className="min-h-screen bg-[#050F1A] light:bg-gray-50 flex flex-col">
      <div className="relative flex-1 flex flex-col px-4 py-4 sm:py-6 max-w-md lg:max-w-lg mx-auto w-full animate-pulse">
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-28 bg-[#0B1E33] light:bg-white rounded-lg" />
            <div className="h-2.5 w-24 bg-[#0B1E33] light:bg-white rounded" />
          </div>
          <div className="h-10 w-24 bg-[#0B1E33] light:bg-white border border-[#1C3350] light:border-gray-200 rounded-xl" />
        </div>
        <div className="mb-4 space-y-2">
          <div className="h-3 w-20 bg-[#0B1E33] light:bg-white rounded" />
          <div className="h-6 w-44 bg-[#0B1E33] light:bg-white rounded" />
          <div className="h-3.5 w-64 bg-[#0B1E33] light:bg-white rounded" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="bg-[#0B1E33] light:bg-white border border-[#1C3350] light:border-gray-200 rounded-xl h-[76px]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
