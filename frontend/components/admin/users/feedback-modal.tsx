'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { Star, MessageSquare, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, User } from 'lucide-react';
import {
  list as listFeedback,
  FeedbackFetchError,
  type FeedbackListResult,
  type FeedbackRow,
} from '@/lib/admin/services/feedback.service';

/**
 * Admin User Management — Staff Feedback modal (S6-T6 revised).
 *
 * Triggered by double-clicking a CONDUCTOR or DRIVER row in the users table.
 * Replaces the standalone "Feedback QR" admin module — consolidates feedback
 * review into User Management so the admin has one place to audit staff
 * performance.
 *
 * Fetches paginated feedback + summary stats (average_rating, total_count,
 * 5→1 distribution) from GET /api/admin/feedback?conductor_id=|driver_id=.
 *
 * The QR → feedback relationship: the QR is permanently tied to the unit
 * (vehicle). When a commuter scans it, the system resolves TODAY's driver +
 * conductor for that unit and the feedback lands on BOTH their profiles.
 * This modal shows the accumulated history for a single staff member.
 */
export interface FeedbackModalStaff {
  id: string;
  role: 'CONDUCTOR' | 'DRIVER';
  name: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: FeedbackModalStaff | null;
}

const PER_PAGE = 5;

export function FeedbackModal({ isOpen, onClose, staff }: FeedbackModalProps) {
  const [data, setData] = useState<FeedbackListResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchFeedback = useCallback(
    async (targetPage: number) => {
      if (!staff) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await listFeedback({
          conductorId: staff.role === 'CONDUCTOR' ? staff.id : undefined,
          driverId: staff.role === 'DRIVER' ? staff.id : undefined,
          perPage: PER_PAGE,
          page: targetPage,
        });
        setData(result);
        setPage(result.pagination.currentPage);
      } catch (err) {
        if (err instanceof FeedbackFetchError) {
          setError(err.message);
        } else {
          setError('Failed to load feedback.');
        }
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [staff]
  );

  // Reset + fetch on open / staff change.
  useEffect(() => {
    if (isOpen && staff) {
      setData(null);
      setError(null);
      setPage(1);
      fetchFeedback(1);
    }
  }, [isOpen, staff, fetchFeedback]);

  const canPrev = (data?.pagination.currentPage ?? 1) > 1;
  const canNext = (data?.pagination.currentPage ?? 1) < (data?.pagination.lastPage ?? 1);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {staff && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare size={22} className="text-sky-400" />
                Feedback & Ratings
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-slate-300">{staff.name}</span>
                <Badge variant={staff.role === 'DRIVER' ? 'info' : 'success'}>
                  {staff.role === 'DRIVER' ? 'Driver' : 'Conductor'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && !data && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <RefreshCw size={28} className="text-sky-400 animate-spin" />
              <p className="text-sm text-slate-400">Loading feedback…</p>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <AlertCircle size={28} className="text-red-400" />
              <p className="text-sm text-red-400 text-center">{error}</p>
              <button
                onClick={() => fetchFeedback(page)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#1A2540] text-slate-200 rounded-md hover:bg-[#243352] transition-colors"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {/* Content */}
          {data && !error && (
            <>
              {/* Summary card */}
              <SummaryCard summary={data.summary} />

              {/* Feedback list */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  Recent Feedback
                </h3>
                {data.feedback.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <User size={32} className="text-slate-600" />
                    <p className="text-sm text-slate-400">No feedback submitted yet.</p>
                    <p className="text-xs text-slate-500 text-center max-w-xs">
                      Feedback appears here when commuters scan the unit QR and rate
                      their ride after a shift.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {data.feedback.map((row) => (
                      <FeedbackRowCard key={row.id} row={row} />
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {data.pagination.lastPage > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-[#1E2D45]">
                  <p className="text-xs text-slate-500">
                    Showing {data.pagination.from ?? 0}–{data.pagination.to ?? 0} of{' '}
                    {data.pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => canPrev && fetchFeedback(data.pagination.currentPage - 1)}
                      disabled={!canPrev || isLoading}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-xs text-slate-400 px-1">
                      {data.pagination.currentPage} / {data.pagination.lastPage}
                    </span>
                    <button
                      onClick={() => canNext && fetchFeedback(data.pagination.currentPage + 1)}
                      disabled={!canNext || isLoading}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Summary card ───────────────────────────────────────────────────

function SummaryCard({
  summary,
}: {
  summary: FeedbackListResult['summary'];
}) {
  const { averageRating, totalCount, distribution } = summary;
  const maxDist = Math.max(1, ...Object.values(distribution));

  return (
    <div className="rounded-md bg-[#0E1628] border border-[#1E2D45] p-4">
      <div className="flex items-center gap-6">
        {/* Big average */}
        <div className="flex-shrink-0 text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-3xl font-bold text-white">
              {averageRating.toFixed(1)}
            </span>
            <Star size={20} className="text-amber-400 fill-amber-400" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {totalCount} review{totalCount === 1 ? '' : 's'}
          </p>
        </div>

        {/* Distribution bars */}
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[String(star)] ?? 0;
            const pct = (count / maxDist) * 100;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-3 text-right">{star}</span>
                <Star size={11} className="text-slate-500 fill-slate-600" />
                <div className="flex-1 h-1.5 bg-[#1A2540] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400/70 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-5 text-right tabular-nums">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Single feedback row ────────────────────────────────────────────

function FeedbackRowCard({ row }: { row: FeedbackRow }) {
  const date = row.createdAt
    ? new Date(row.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="p-3 bg-[#0E1628] rounded-md border border-[#1E2D45]">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={13}
              className={
                s <= row.rating
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-600 fill-slate-700'
              }
            />
          ))}
          {row.category && (
            <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">
              {row.category}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">{date}</span>
      </div>
      {row.comment && (
        <p className="text-sm text-slate-300 mb-2 italic">“{row.comment}”</p>
      )}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <User size={11} />
          {row.commuter?.name ?? 'Anonymous'}
        </span>
        {row.vehicle && (
          <span>
            Unit {row.vehicle.unitNumber} · {row.vehicle.plateNumber}
          </span>
        )}
      </div>
    </div>
  );
}
