import { LostItem, ClaimStatus } from "@/app/(commuter)/lost-and-found/types";
import { getClaimDeadline } from "@/app/(commuter)/lost-and-found/claim-deadline";
import {
  Bookmark,
  CheckCircle2,
  Clock3,
  PackageSearch,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface LostItemCardProps {
  item: LostItem;
  isWatched: boolean;
  claimStatus: ClaimStatus;
  onToggleWatchlist: (id: string) => void;
  onOpenClaimModal: (item: LostItem) => void;
  /** Opens the cancel-claim confirmation modal for this item. */
  onCancelClaim: (id: string) => void;
  onOpenDetails: (item: LostItem) => void;
  getStatusBadge: (status: ClaimStatus) => string;
}

/**
 * Item tile inside a trip group (see TripLedger), shaped like the paper tag a
 * found item carries: photo, then the tag body (category with the claim
 * deadline or claim status, name, time lost), then a tear line above the
 * claim stub (claim action + bookmark). The whole tile opens the detail view
 * through the stretched title button; the stub's buttons sit above it (z-10).
 */
export default function LostItemCard({
  item,
  isWatched,
  claimStatus,
  onToggleWatchlist,
  onOpenClaimModal,
  onCancelClaim,
  onOpenDetails,
  getStatusBadge,
}: LostItemCardProps) {
  const claimLabel =
    claimStatus === "PENDING"
      ? "Pending"
      : claimStatus === "VALIDATED"
        ? "Validated"
        : claimStatus === "RELEASED"
          ? "Released"
          : claimStatus === "REJECTED"
            ? "Rejected"
            : null;

  // Only unclaimed items run the expiry clock (the backend sends null otherwise).
  const deadline = claimStatus === "NONE" ? getClaimDeadline(item.claimableUntil) : null;

  const claimAction =
    claimStatus === "PENDING"
      ? { label: "Cancel Claim", onClick: () => onCancelClaim(item.id), className: "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/10 hover:text-white light:border-gray-200 light:bg-white light:text-gray-600 light:hover:bg-gray-100 light:hover:text-gray-900" }
      : claimStatus === "REJECTED" || claimStatus === "NONE"
        ? { label: claimStatus === "REJECTED" ? "Claim Again" : "Claim Item", onClick: () => onOpenClaimModal(item), className: "border-[#FF6D3A]/30 bg-[#FF6D3A]/10 text-[#FF9A73] hover:border-[#FF6D3A] hover:bg-[#FF6D3A] hover:text-white light:text-[#E55A2B] light:hover:text-white" }
        : null;

  return (
    // `isolate` keeps the z-10 buttons layered within the tile only, so they
    // scroll under the sticky day header instead of painting over it.
    <article className="group relative isolate flex h-full flex-col overflow-hidden rounded-lg border border-white/8 bg-[#0B1E33] transition-colors hover:border-[#62A0EA]/40 focus-within:border-[#62A0EA]/40 light:border-gray-200 light:bg-white light:hover:border-[#1A5FB4]/40 light:focus-within:border-[#1A5FB4]/40">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0A1E33] light:bg-gray-100">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-white/20 light:text-gray-400">
            <PackageSearch className="h-7 w-7" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">No photo yet</span>
          </div>
        )}
      </div>

      {/* Tag body */}
      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <div className="flex min-h-5 items-center justify-between gap-2">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-white/50 light:text-gray-500">{item.category}</span>
          {deadline ? (
            <span
              className={`flex-shrink-0 text-[11px] font-semibold tabular-nums ${deadline.isUrgent ? "text-amber-300 light:text-amber-700" : "text-white/60 light:text-gray-500"}`}
              title={`Claim by ${deadline.dateLabel}`}
            >
              {deadline.label}
            </span>
          ) : claimLabel ? (
            <span className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(claimStatus)}`}>
              {claimStatus === "PENDING" && <Clock3 className="h-3 w-3" />}
              {claimStatus === "VALIDATED" && <CheckCircle2 className="h-3 w-3" />}
              {claimStatus === "RELEASED" && <ShieldCheck className="h-3 w-3" />}
              {claimStatus === "REJECTED" && <XCircle className="h-3 w-3" />}
              {claimLabel}
            </span>
          ) : null}
        </div>

        <h3 className="mt-1.5 min-h-10">
          <button
            type="button"
            onClick={() => onOpenDetails(item)}
            className="line-clamp-2 text-left text-sm font-semibold leading-5 text-white/90 light:text-gray-900 transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-white focus:outline-none"
          >
            {item.itemName}
          </button>
        </h3>

        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-white/60 light:text-gray-500">
          <Clock3 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{item.estimatedTimeLost || "Time unavailable"}</span>
        </p>
      </div>

      {/* Tear line with tag notches, then the claim stub. */}
      <div aria-hidden="true" className="relative">
        <div className="mx-3 border-t border-dashed border-white/15 light:border-gray-300" />
        <span className="pointer-events-none absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/10 bg-[#050F1A] light:border-gray-200 light:bg-[#F8FAFC]" />
        <span className="pointer-events-none absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/10 bg-[#050F1A] light:border-gray-200 light:bg-[#F8FAFC]" />
      </div>

      <div className="flex items-center gap-2 p-3">
        {claimAction ? (
          <button
            type="button"
            onClick={claimAction.onClick}
            className={`relative z-10 h-9 min-w-0 flex-1 rounded-md border text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] ${claimAction.className}`}
          >
            {claimAction.label}
          </button>
        ) : (
          <div className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold ${claimStatus === "RELEASED" ? "border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#8CB9F0] light:text-[#1A5FB4]" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 light:text-emerald-700"}`}>
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{claimStatus === "RELEASED" ? "Claim completed" : "Ready for release"}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => onToggleWatchlist(item.id)}
          aria-label={isWatched ? "Remove bookmark" : "Bookmark item"}
          aria-pressed={isWatched}
          className={`relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] ${
            isWatched
              ? "border-[#62A0EA]/45 bg-[#1A5FB4]/20 text-[#8CB9F0] light:bg-[#1A5FB4]/10 light:text-[#1A5FB4]"
              : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/10 hover:text-white light:border-gray-200 light:bg-white light:text-gray-600 light:hover:bg-gray-100 light:hover:text-gray-900"
          }`}
        >
          <Bookmark className={`h-4 w-4 ${isWatched ? "fill-current" : ""}`} />
        </button>
      </div>
    </article>
  );
}
