"use client";

const PICKUP_POINTS = [
  { name: "Malolos Terminal", count: 2450 },
  { name: "Meycauayan Crossing", count: 1820 },
  { name: "Calumpit Town Proper", count: 1240 },
  { name: "Guiguinto Stop", count: 890 },
  { name: "Marilao Highroad", count: 650 },
];

const maxPickup = Math.max(...PICKUP_POINTS.map((p) => p.count));

export function PickupPointsList() {
  return (
    // Fixed outer container height
    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-5 h-[340px] flex flex-col">
      <h3 className="text-sm font-semibold text-white mb-4 flex-shrink-0">Most Used Pickup Points</h3>
      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {PICKUP_POINTS.map((point, index) => (
          <div key={point.name} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              index === 0 ? "bg-[#1A5FB4] text-white" : "bg-white/[0.06] text-white/40"
            }`}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/70 font-medium truncate">{point.name}</span>
                <span className="text-xs text-white/40 ml-2 flex-shrink-0">{point.count} pickups</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#62A0EA] rounded-full transition-all" 
                  style={{ width: `${(point.count / maxPickup) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}