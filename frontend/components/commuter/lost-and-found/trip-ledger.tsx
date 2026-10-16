import type { ReactNode } from "react";
import type { LostItem } from "@/app/(commuter)/lost-and-found/types";

/**
 * Lost & Found grouped the way a commuter remembers a lost item: the day it
 * was turned in, then the jeep (plate + crew) it was found on. Items arrive
 * newest first from the API, so grouping keeps that order; a trip split by a
 * page boundary simply repeats its header on the next page.
 */
interface TripGroup {
  key: string;
  plateNumber: string;
  driverName: string;
  conductorName: string;
  items: LostItem[];
}

interface DayGroup {
  key: string;
  label: string;
  dateLabel: string;
  count: number;
  trips: TripGroup[];
}

export function groupItemsByTrip(items: LostItem[], now = new Date()): DayGroup[] {
  const days = new Map<string, DayGroup>();

  for (const item of items) {
    const posted = new Date(item.datePosted);
    const valid = !Number.isNaN(posted.getTime());
    const dayKey = valid ? `${posted.getFullYear()}-${posted.getMonth()}-${posted.getDate()}` : "unknown";

    let day = days.get(dayKey);
    if (!day) {
      day = { key: dayKey, ...dayLabels(valid ? posted : null, now), count: 0, trips: [] };
      days.set(dayKey, day);
    }

    // Same plate with a different crew is a different trip (another shift).
    const tripKey = [item.plateNumber, item.driverName, item.conductorName].join("|");
    let trip = day.trips.find(t => t.key === tripKey);
    if (!trip) {
      trip = { key: tripKey, plateNumber: item.plateNumber, driverName: item.driverName, conductorName: item.conductorName, items: [] };
      day.trips.push(trip);
    }
    trip.items.push(item);
    day.count++;
  }

  return Array.from(days.values());
}

function dayLabels(date: Date | null, now: Date): { label: string; dateLabel: string } {
  if (!date) return { label: "Date unavailable", dateLabel: "" };
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return { label: diff === 0 ? "Today" : diff === 1 ? "Yesterday" : weekday, dateLabel };
}

export default function TripLedger({ items, renderItem }: { items: LostItem[]; renderItem: (item: LostItem) => ReactNode }) {
  const days = groupItemsByTrip(items);

  return (
    <div className="space-y-8 lg:space-y-10">
      {days.map(day => (
        <section key={day.key} aria-labelledby={`lf-day-${day.key}`}>
          <header className="sticky top-0 z-[1] -mx-4 flex items-baseline justify-between gap-3 border-b border-white/10 bg-[#050F1A]/95 light:border-gray-200 light:bg-[#F8FAFC]/95 px-4 py-3 backdrop-blur-sm lg:-mx-8 lg:px-8 xl:mx-0 xl:px-0">
            <h2 id={`lf-day-${day.key}`} className="flex min-w-0 items-baseline gap-2.5">
              <span className="text-sm font-bold text-white light:text-gray-900">{day.label}</span>
              {day.dateLabel && <span className="text-xs font-medium text-white/50 light:text-gray-500">{day.dateLabel}</span>}
            </h2>
            <span className="flex-shrink-0 text-xs font-medium tabular-nums text-white/50 light:text-gray-500">
              {day.count} item{day.count === 1 ? "" : "s"}
            </span>
          </header>

          <div className="divide-y divide-white/[0.06] light:divide-gray-200">
            {day.trips.map(trip => (
              <div key={trip.key} className="grid gap-3 py-5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6 xl:grid-cols-[12.5rem_minmax(0,1fr)]">
                {/* A lone trip's count would just repeat the day total. */}
                <TripMeta trip={trip} showCount={day.trips.length > 1} />
                {/* Phones: one swipeable row per jeep. Wider screens: a wrapping grid. */}
                <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 md:scroll-px-0 [scrollbar-width:none] md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-3 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
                  {trip.items.map(item => (
                    <li key={item.id} className="w-[44%] flex-shrink-0 snap-start sm:w-[31%] md:w-auto">
                      {renderItem(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TripMeta({ trip, showCount }: { trip: TripGroup; showCount: boolean }) {
  const count = trip.items.length;
  return (
    // Desktop: pinned under the day header so the plate stays beside its items.
    <div className="flex min-w-0 items-start justify-between gap-3 md:sticky md:top-16 md:block md:self-start">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45 light:text-gray-500">Found on</p>
        <p className="mt-0.5 truncate text-lg font-bold leading-tight text-[#8CB9F0] light:text-[#1A5FB4]">{trip.plateNumber || "Plate unavailable"}</p>
        <dl className="mt-2 hidden space-y-1 text-xs md:block">
          <CrewLine label="Driver" value={trip.driverName || "Driver unavailable"} />
          <CrewLine label="Conductor" value={trip.conductorName || "Conductor unavailable"} />
        </dl>
        {/* Phones keep the crew on one line beside the plate block. */}
        <p className="mt-1 truncate text-xs text-white/55 light:text-gray-500 md:hidden">
          {trip.driverName || "Driver unavailable"} &middot; {trip.conductorName || "Conductor unavailable"}
        </p>
      </div>
      {showCount && (
        <p className="flex-shrink-0 text-xs font-medium tabular-nums text-white/45 light:text-gray-500 md:mt-3">
          {count} item{count === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

function CrewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="w-[4.5rem] flex-shrink-0 text-white/45 light:text-gray-500">{label}</dt>
      <dd className="min-w-0 truncate font-medium text-white/80 light:text-gray-700">{value}</dd>
    </div>
  );
}

export function TripLedgerSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      {[3, 2].map((tiles, day) => (
        <div key={day}>
          <div className="flex justify-between border-b border-white/10 py-3 light:border-gray-200">
            <div className="h-4 w-36 rounded bg-white/[0.06] light:bg-gray-200" />
            <div className="h-4 w-14 rounded bg-white/[0.06] light:bg-gray-200" />
          </div>
          {[0, 1].map(trip => (
            <div key={trip} className="grid gap-3 py-5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-6 xl:grid-cols-[12.5rem_minmax(0,1fr)]">
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-white/[0.06] light:bg-gray-200" />
                <div className="h-5 w-28 rounded bg-white/[0.08] light:bg-gray-200" />
                <div className="hidden h-3 w-36 rounded bg-white/[0.05] light:bg-gray-100 md:block" />
              </div>
              <div className="flex gap-2.5 overflow-hidden md:grid md:grid-cols-3 md:gap-3">
                {Array.from({ length: tiles }).map((_, i) => (
                  <div key={i} className="w-[44%] flex-shrink-0 overflow-hidden rounded-lg border border-white/8 bg-[#0B1E33] light:border-gray-200 light:bg-white sm:w-[31%] md:w-auto">
                    <div className="aspect-[4/3] animate-pulse bg-white/5 light:bg-gray-100 motion-reduce:animate-none" />
                    <div className="space-y-2 px-3 pb-3 pt-2.5">
                      <div className="flex justify-between"><div className="h-2.5 w-12 rounded bg-white/[0.05] light:bg-gray-100" /><div className="h-2.5 w-14 rounded bg-white/[0.05] light:bg-gray-100" /></div>
                      <div className="h-3.5 w-4/5 rounded bg-white/[0.07] light:bg-gray-200" />
                      <div className="h-3 w-1/2 rounded bg-white/[0.05] light:bg-gray-100" />
                    </div>
                    <div className="mx-3 border-t border-dashed border-white/10 light:border-gray-200" />
                    <div className="flex gap-2 p-3">
                      <div className="h-9 flex-1 rounded-md bg-white/[0.04] light:bg-gray-100" />
                      <div className="h-9 w-9 rounded-md bg-white/[0.04] light:bg-gray-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
