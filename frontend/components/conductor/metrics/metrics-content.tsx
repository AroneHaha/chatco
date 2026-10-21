"use client";

import { Star } from "lucide-react";
import { useConductorRatings } from "@/app/(conductor)/hooks/use-conductor-ratings";
import type { RatingMetrics } from "@/lib/conductor/services/ratings.service";

function Stars({ score }: { score: number }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className="relative block size-4 text-white/15">
          <Star className="size-4" />
          <span
            className="absolute inset-y-0 left-0 overflow-hidden text-amber-400"
            style={{ width: `${Math.min(1, Math.max(0, score - star + 1)) * 100}%` }}
          >
            <Star className="size-4 fill-current" />
          </span>
        </span>
      ))}
    </div>
  );
}

function RoleRating({ title, description, average, count }: {
  title: string;
  description: string;
  average: number;
  count: number;
}) {
  return (
    <div className="min-w-0 p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-white/45">{description}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight text-[#62A0EA] tabular-nums">
            {count > 0 ? average.toFixed(1) : "\u2014"}
          </span>
          <span className="text-xs text-white/40">/ 5</span>
        </div>
        <span className="text-xs text-white/55 tabular-nums">
          {count.toLocaleString()} {count === 1 ? "rating" : "ratings"}
        </span>
      </div>
    </div>
  );
}

function RatingOverview({ metrics }: { metrics: RatingMetrics }) {
  return (
    <section aria-label="All-time rating summary" className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="grid sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 p-5 sm:p-6">
          <h2 className="text-sm font-medium text-white/60">Combined rating</h2>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-6xl font-semibold leading-none tracking-tight text-white tabular-nums">
              {metrics.averageRating.toFixed(1)}
            </span>
            <span className="text-sm text-white/40">/ 5</span>
          </div>
          <div className="mt-3"><Stars score={metrics.averageRating} /></div>
          <p className="mt-3 text-xs leading-relaxed text-white/45">Driver and conductor scores combined</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div>
              <dt className="text-xs text-white/45">Total ratings</dt>
              <dd className="mt-1.5 text-xl font-semibold text-white tabular-nums">{metrics.totalRatings.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/45">Rated 4 or 5 stars</dt>
              <dd className="mt-1.5 text-xl font-semibold text-[#62A0EA] tabular-nums">{metrics.overallSatisfaction}%</dd>
            </div>
          </dl>
        </div>

        <div className="min-w-0 border-t border-white/10 p-5 sm:border-t-0 sm:border-l sm:p-6">
          <h2 className="text-sm font-semibold text-white">Rating breakdown</h2>
          <p className="mt-1 text-xs text-white/45">All driver and conductor scores</p>
          <div className="mt-6 space-y-4">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = metrics.distribution[star - 1];
              const percent = metrics.totalRatings > 0 ? count / metrics.totalRatings * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3" aria-label={`${star} stars: ${count} ratings, ${Math.round(percent)} percent`}>
                  <span className="flex w-7 shrink-0 items-center gap-1 text-xs font-medium text-white/70" aria-hidden="true">
                    {star}<Star className="size-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-white/[0.06]" aria-hidden="true">
                    <div className="h-full rounded-sm bg-[#62A0EA]" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-white/70 tabular-nums" aria-hidden="true">{count.toLocaleString()}</span>
                  <span className="w-9 shrink-0 text-right text-xs text-white/40 tabular-nums" aria-hidden="true">{Math.round(percent)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid divide-y divide-white/10 border-t border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <RoleRating title="Your rating" description="Your conductor scores across all shifts" average={metrics.conductorAverage} count={metrics.conductorCount} />
        <RoleRating title="Driver ratings" description="Driver scores from the shifts you crewed" average={metrics.driverAverage} count={metrics.driverCount} />
      </div>
    </section>
  );
}

/** Shared by the small-screen page and large-screen dock modal. */
export default function MetricsContent({ showHeader = true }: { showHeader?: boolean }) {
  const { metrics, status, error, refresh } = useConductorRatings();
  const loading = status === "loading";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6">
      <div>
        {showHeader && <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Performance Metrics</h1>}
        <p className={`${showHeader ? "mt-1.5" : ""} text-sm leading-relaxed text-white/50`}>Commuter ratings across all your shifts</p>
        <p className="mt-2 text-xs font-medium text-[#62A0EA]">All time</p>
      </div>

      {loading ? (
        <div role="status" aria-label="Loading ratings" className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="grid sm:grid-cols-2">
            <div className="space-y-5 p-6">
              <div className="h-4 w-28 rounded bg-white/5" />
              <div className="h-16 w-32 rounded bg-white/5" />
              <div className="h-16 rounded bg-white/5" />
            </div>
            <div className="space-y-5 p-6">{[1, 2, 3, 4, 5].map((row) => <div key={row} className="h-4 rounded bg-white/5" />)}</div>
          </div>
          <div className="h-36 border-t border-white/10" />
        </div>
      ) : status === "error" ? (
        <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-6">
          <h2 className="text-sm font-semibold text-white">Ratings unavailable</h2>
          <p className="mt-2 text-sm text-white/55">{error}</p>
          <button type="button" onClick={() => void refresh()} className="mt-4 min-h-11 rounded-lg bg-[#1A5FB4] px-4 text-sm font-medium text-white hover:bg-[#164A8F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]">Try again</button>
        </div>
      ) : metrics.totalRatings === 0 ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
          <Star className="mx-auto size-8 text-[#62A0EA]/70" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="mt-5 text-base font-semibold text-white">No ratings yet</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/50">Your ratings will appear here when commuters submit feedback.</p>
        </section>
      ) : <RatingOverview metrics={metrics} />}
    </div>
  );
}
