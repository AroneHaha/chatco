// components/admin/vehicles/driver-detail-modal.tsx
"use client";

import { useMemo } from "react";
import { Modal } from "@/components/admin/ui/modal";
import { Badge } from "@/components/admin/ui/badge";
import {
  Star,
  Phone,
  Car,
  Calendar,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  MessageCircle,
} from "lucide-react";
import type { DriverProfile, DriverRating } from "@/app/(admin)/vehicles/data/vehicles-data";

interface DriverDetailModalProps {
  driverId: number | null;
  onClose: () => void;
  driverProfiles: Record<string, DriverProfile>;
  driverRatings: Record<string, DriverRating[]>;
}

// ─── Star Rating Display ───
function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-600"
          }
        />
      ))}
    </div>
  );
}

// ─── Percentage Bar ───
function RatingBar({
  stars,
  count,
  total,
}: {
  stars: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-3 text-right">{stars}</span>
      <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />
      <div className="flex-1 h-2 bg-[#0E1628] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            stars >= 4
              ? "bg-amber-400"
              : stars === 3
                ? "bg-sky-400"
                : "bg-red-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-500 w-10 text-right">{pct}%</span>
      <span className="text-[10px] text-slate-600 w-6 text-right">({count})</span>
    </div>
  );
}

export function DriverDetailModal({ driverId, onClose, driverProfiles, driverRatings }: DriverDetailModalProps) {
  const profile: DriverProfile | undefined = driverId
    ? driverProfiles[String(driverId)]
    : undefined;
  const ratings: DriverRating[] = driverId
    ? driverRatings[String(driverId)] || []
    : [];

  // Compute rating stats
  const { avgRating, distribution, totalRatings, positivePct } = useMemo(() => {
    if (ratings.length === 0)
      return {
        avgRating: "0.0",
        distribution: [0, 0, 0, 0, 0],
        totalRatings: 0,
        positivePct: 0,
      };

    const sum = ratings.reduce((a, r) => a + r.rating, 0);
    const avg = (sum / ratings.length).toFixed(1);
    const dist = [0, 0, 0, 0, 0];
    ratings.forEach((r) => dist[r.rating - 1]++);
    const positive = dist[4] + dist[3]; // 5-star + 4-star
    const posPct = Math.round((positive / ratings.length) * 100);

    return { avgRating: avg, distribution: dist, totalRatings: ratings.length, positivePct: posPct };
  }, [ratings]);

  // Count low ratings for flagging
  const lowRatings = ratings.filter((r) => r.rating <= 2).length;

  if (!driverId || !profile) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      maxWidth="max-w-6xl"
      rounded="rounded-xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:h-[60vh] gap-0">
        {/* ═══════ LEFT PANEL: Driver Data + Rating Breakdown ═══════ */}
        <div className="flex flex-col lg:h-full overflow-y-auto p-5 lg:p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-[#1E2D45]">
          {/* Profile Header with Photo */}
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.profilePic}
              alt={profile.name}
              className="w-20 h-20 rounded-xl border-2 border-[#62A0EA]/25 flex-shrink-0 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold text-white truncate">{profile.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-[#62A0EA]/15 text-[#62A0EA]">
                  Driver
                </span>
                <Badge variant="info">ID: {profile.id}</Badge>
              </div>
            </div>
          </div>

          {/* Contact & Info Grid */}
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
              <Phone size={15} className="text-slate-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-600 uppercase">Contact</p>
                <p className="text-sm text-slate-300">{profile.contact}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
              <CreditCard size={15} className="text-slate-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-600 uppercase">License</p>
                <p className="text-sm text-slate-300 truncate">{profile.licenseNumber}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-slate-600 uppercase">Expires</p>
                <p className={`text-xs font-medium ${new Date(profile.licenseExpiry) < new Date('2025-12-31') ? 'text-red-400' : 'text-slate-400'}`}>
                  {profile.licenseExpiry}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
              <Calendar size={15} className="text-slate-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-600 uppercase">Hire Date</p>
                <p className="text-sm text-slate-300">{profile.hireDate}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-slate-600 uppercase">Total Trips</p>
                <p className="text-xs font-medium text-white">{profile.totalTrips.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
              <Car size={15} className="text-slate-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-600 uppercase">Assigned Vehicle</p>
                <p className="text-sm text-slate-300">{profile.assignedVehicle || <span className="italic text-slate-600">Unassigned</span>}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-slate-600 uppercase">Route</p>
                <p className="text-xs text-slate-400">{profile.assignedRoute || <span className="italic text-slate-600">—</span>}</p>
              </div>
            </div>
          </div>

          {/* Flags */}
          {lowRatings > 0 && (
            <div className="p-3 rounded-md bg-red-400/5 border border-red-400/15">
              <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Active Flags
              </p>
              <div className="flex flex-wrap gap-2">
                {lowRatings > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-400/10 text-red-400">
                    {lowRatings} low rating{lowRatings > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Rating Breakdown ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                <Star size={13} className="text-amber-400" />
                Rating Breakdown
              </h3>
              <span className="text-[10px] text-slate-600">{totalRatings} reviews</span>
            </div>

            {totalRatings === 0 ? (
              <p className="text-xs text-slate-600 italic py-6 text-center">
                No ratings yet.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Average + Positive % */}
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <p className="text-3xl font-bold text-white">{avgRating}</p>
                    <StarRating rating={Math.round(Number(avgRating))} size={16} />
                    <p className="text-[10px] text-slate-500 mt-1">average</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <TrendingUp size={13} className="text-sky-400" />
                      <span className="text-slate-400">Positive (4-5 stars)</span>
                    </div>
                    <div className="w-full h-3 bg-[#0E1628] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-400 transition-all duration-500"
                        style={{ width: `${positivePct}%` }}
                      />
                    </div>
                    <p className="text-right text-sm font-bold text-sky-400">{positivePct}%</p>
                  </div>
                </div>

                {/* Per-star bars */}
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <RatingBar
                      key={star}
                      stars={star}
                      count={distribution[star - 1]}
                      total={totalRatings}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════ RIGHT PANEL: Commuter Feedback Only ═══════ */}
        <div className="flex flex-col lg:h-full overflow-hidden p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
              <MessageCircle size={13} className="text-[#62A0EA]" />
              Commuter Feedback
            </h3>
            <Badge variant="info">{ratings.length} review{ratings.length !== 1 ? "s" : ""}</Badge>
          </div>

          {ratings.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle size={32} className="text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-600 italic">No feedback submitted yet.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {ratings.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-md bg-[#0E1628] border border-[#1E2D45] space-y-2"
                >
                  {/* Header: stars + date */}
                  <div className="flex items-center justify-between">
                    <StarRating rating={r.rating} />
                    <span className="text-[10px] text-slate-600">{r.date}</span>
                  </div>

                  {/* Comment */}
                  <p className="text-sm text-slate-300 leading-relaxed">{r.comment}</p>

                  {/* Footer: commuter + route */}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-slate-500">
                      By: <span className="text-slate-400 font-medium">{r.commuterName}</span>
                    </p>
                    <span className="text-[10px] text-slate-600 bg-[#1A2540] px-2 py-0.5 rounded">
                      {r.route}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}