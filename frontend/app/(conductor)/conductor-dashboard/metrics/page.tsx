"use client";

import { useState, useEffect } from "react";
import { getActiveShift, type ConductorShift } from "@/lib/conductor-shift";
import {
  seedRatingsForShift,
  calculateMetrics,
  getGaugeColor,
  getGaugeTextClass,
  type ConductorRating,
  type RatingMetrics,
} from "@/lib/conductor-ratings";

// ─── Constants ───────────────────────────────────────────────────────
const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_FRACTION = 0.75; // 3/4 circle
const ARC_LENGTH = CIRCUMFERENCE * ARC_FRACTION;
const GAUGE_ROTATION = 135; // degrees – starts at ~7:30 position

// ─── Sub-components ──────────────────────────────────────────────────

function StarIcon({
  filled,
  size = 14,
}: {
  filled: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "#FBBF24" : "none"}
      stroke={filled ? "#FBBF24" : "rgba(255,255,255,0.15)"}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function Stars({ score, size = 14 }: { score: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= score} size={size} />
      ))}
    </div>
  );
}

// ─── Gauge Section ───────────────────────────────────────────────────

function GaugeSection({ metrics }: { metrics: RatingMetrics }) {
  const { overallSatisfaction, averageRating, totalRatings } = metrics;
  const color = getGaugeColor(overallSatisfaction);
  const textClass = getGaugeTextClass(overallSatisfaction);
  const offset = ARC_LENGTH * (1 - overallSatisfaction / 100);

  return (
    <div className="flex flex-col items-center">
      {/* SVG Gauge */}
      <div className="relative" style={{ width: "15rem", height: "11.5rem" }}>
        <svg
          viewBox="0 0 200 165"
          className="w-full h-full"
          aria-label={`Satisfaction gauge: ${overallSatisfaction}%`}
        >
          {/* Background track */}
          <circle
            cx={100}
            cy={100}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={10}
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            transform={`rotate(${GAUGE_ROTATION} 100 100)`}
          />
          {/* Progress arc */}
          <circle
            cx={100}
            cy={100}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(${GAUGE_ROTATION} 100 100)`}
            style={{
              transition: "stroke-dashoffset 1s ease-out, stroke 0.4s ease",
            }}
          />
        </svg>

        {/* Center text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pb-1">
          <span className={`text-5xl font-bold leading-none ${textClass}`}>
            {overallSatisfaction}%
          </span>
          <span className="text-[10px] uppercase tracking-widest font-semibold text-white/40 mt-1.5">
            Satisfaction
          </span>
        </div>
      </div>

      {/* Metric blocks row */}
      <div className="grid grid-cols-2 gap-3 w-full mt-2">
        <MetricBlock
          icon="⭐"
          label="Avg Rating"
          value={averageRating.toFixed(1)}
        />
        <MetricBlock
          icon="👥"
          label="Total Ratings"
          value={String(totalRatings)}
        />
      </div>
    </div>
  );
}

function MetricBlock({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#071A2E] border border-white/[0.06] rounded-xl px-3 py-3 flex flex-col items-center gap-1">
      <span className="text-base">{icon}</span>
      <span className="text-white font-bold text-lg leading-none">{value}</span>
      <span className="text-[9px] uppercase tracking-wider font-semibold text-white/40 leading-tight text-center">
        {label}
      </span>
    </div>
  );
}

// ─── Dual Score Cards ────────────────────────────────────────────────

function DualCards({
  metrics,
  driverName,
}: {
  metrics: RatingMetrics;
  driverName: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ScoreCard
        title="Your Performance"
        subtitle="Conductor"
        average={metrics.conductorAverage}
        count={metrics.conductorCount}
        accentColor="#62A0EA"
      />
      <ScoreCard
        title="Driver's Performance"
        subtitle={driverName || "Assigned Driver"}
        average={metrics.driverAverage}
        count={metrics.driverCount}
        accentColor="#A78BFA"
      />
    </div>
  );
}

function ScoreCard({
  title,
  subtitle,
  average,
  count,
  accentColor,
}: {
  title: string;
  subtitle: string;
  average: number;
  count: number;
  accentColor: string;
}) {
  return (
    <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span
            className="text-4xl font-bold leading-none"
            style={{ color: accentColor }}
          >
            {average > 0 ? average.toFixed(1) : "—"}
          </span>
          <span className="text-white/30 text-xs mt-1">
            {count} {count === 1 ? "rating" : "ratings"}
          </span>
        </div>
        {average > 0 && <Stars score={Math.round(average)} size={18} />}
      </div>
    </div>
  );
}

// ─── Rating Distribution ─────────────────────────────────────────────

function DistributionSection({ metrics }: { metrics: RatingMetrics }) {
  const maxCount = Math.max(...metrics.distribution, 1);

  return (
    <div className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-5">
      <h3 className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-4">
        Rating Distribution
      </h3>
      <div className="space-y-3">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = metrics.distribution[star - 1];
          const pct =
            metrics.totalRatings > 0
              ? Math.round((count / metrics.totalRatings) * 100)
              : 0;
          const barWidth = (count / maxCount) * 100;

          return (
            <div key={star} className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 w-14 shrink-0">
                <span className="text-white text-sm font-medium">{star}</span>
                <StarIcon filled size={13} />
              </div>
              <div className="flex-1 h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1A5FB4] rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    transition: "width 0.8s ease-out",
                  }}
                />
              </div>
              <div className="w-16 text-right shrink-0">
                <span className="text-white/60 text-xs font-medium">
                  {count}
                </span>
                <span className="text-white/30 text-xs ml-1">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center mb-5">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
      <h2 className="text-white/70 font-semibold text-base mb-1.5">
        No ratings yet for this shift
      </h2>
      <p className="text-white/35 text-sm text-center max-w-xs leading-relaxed">
        Ratings from commuters will appear here once they submit feedback.
      </p>
    </div>
  );
}

// ─── No Shift State ──────────────────────────────────────────────────

function NoShiftState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center mb-5">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <h2 className="text-white/70 font-semibold text-base mb-1.5">
        No active shift
      </h2>
      <p className="text-white/35 text-sm text-center max-w-xs leading-relaxed">
        Start a shift from the dashboard to view your performance metrics.
      </p>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="lg:pl-64 min-h-screen bg-[#050F1A] pb-28 lg:pb-8">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6 animate-pulse">
        <div className="flex flex-col items-center gap-4">
          <div className="w-56 h-44 bg-white/[0.04] rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 w-full">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/[0.04] rounded-xl h-20" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/[0.04] rounded-2xl h-32" />
          <div className="bg-white/[0.04] rounded-2xl h-32" />
        </div>
        <div className="bg-white/[0.04] rounded-2xl h-48" />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function MetricsPage() {
  const [ratings, setRatings] = useState<ConductorRating[]>([]);
  const [shift, setShift] = useState<ConductorShift | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use the real getActiveShift() which checks the correct key
    // AND validates isActive === true
    const activeShift = getActiveShift();

    if (!activeShift) {
      setLoading(false);
      return;
    }

    setShift(activeShift);

    // Pass names as IDs since ConductorShift doesn't carry UUIDs
    const seeded = seedRatingsForShift(
      activeShift.shiftId,
      activeShift.conductorName,
      activeShift.driverName
    );
    setRatings(seeded);
    setLoading(false);
  }, []);

  // ── Loading ──
  if (loading) return <LoadingSkeleton />;

  // ── No active shift ──
  if (!shift) {
    return (
      <div className="lg:pl-64 min-h-screen bg-[#050F1A] pb-28 lg:pb-8">
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <NoShiftState />
        </div>
      </div>
    );
  }

  const metrics = calculateMetrics(ratings);

  // ── Empty state (0 ratings) ──
  if (metrics.totalRatings === 0) {
    return (
      <div className="lg:pl-64 min-h-screen bg-[#050F1A] pb-28 lg:pb-8">
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <PageHeader />
          <EmptyState />
        </div>
      </div>
    );
  }

  // ── Main content ──
  return (
    <div className="lg:pl-64 min-h-screen bg-[#050F1A] pb-28 lg:pb-8">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        <PageHeader />
        <GaugeSection metrics={metrics} />
        <DualCards metrics={metrics} driverName={shift.driverName} />
        <DistributionSection metrics={metrics} />
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="mb-2">
      <h1 className="text-white text-xl font-bold">Performance Metrics</h1>
      <p className="text-white/40 text-sm mt-1">Shift ratings overview</p>
    </div>
  );
}