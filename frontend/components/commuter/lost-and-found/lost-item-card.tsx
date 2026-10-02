import { LostItem, ClaimStatus } from "@/app/(commuter)/lost-and-found/types";
import { getClaimDeadline } from "@/app/(commuter)/lost-and-found/claim-deadline";
import {
  Bookmark,
  CheckCircle2,
  Clock3,
  IdCard,
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
  formatDate: (dateStr: string) => string;
  getStatusBadge: (status: ClaimStatus) => string;
}

/**
 * Compact storefront-style tile: square photo, two-line name, plate number in
 * the "price" slot. The whole tile opens the detail view (stretched title
 * button); the watchlist and claim buttons sit above that layer via z-10.
 */
export default function LostItemCard({
  item,
  isWatched,
  claimStatus,
  onToggleWatchlist,
  onOpenClaimModal,
  onCancelClaim,
  onOpenDetails,
  formatDate,
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
      ? { label: "Cancel Claim", onClick: () => onCancelClaim(item.id), className: "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/10 hover:text-white" }
      : claimStatus === "REJECTED" || claimStatus === "NONE"
        ? { label: claimStatus === "REJECTED" ? "Claim Again" : "Claim Item", onClick: () => onOpenClaimModal(item), className: "border-[#FF6D3A]/30 bg-[#FF6D3A]/10 text-[#FF9A73] hover:border-[#FF6D3A] hover:bg-[#FF6D3A] hover:text-white" }
        : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-white/8 bg-[#0B1E33] transition-colors hover:border-[#62A0EA]/40 focus-within:border-[#62A0EA]/40">
      <div className="relative aspect-square w-full overflow-hidden bg-[#0A1E33]">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-white/20">
            <PackageSearch className="h-8 w-8" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">No photo yet</span>
          </div>
        )}

        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
          {item.category}
        </span>

        <button
          type="button"
          onClick={() => onToggleWatchlist(item.id)}
          aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
          aria-pressed={isWatched}
          className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-md backdrop-blur-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] ${
            isWatched ? "bg-[#1A5FB4]/80 text-white" : "bg-black/45 text-white/80 hover:bg-black/65 hover:text-white"
          }`}
        >
          <Bookmark className={`h-4 w-4 ${isWatched ? "fill-current" : ""}`} />
        </button>

        {claimLabel && (
          <span className={`absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${getStatusBadge(claimStatus)}`}>
            {claimStatus === "PENDING" && <Clock3 className="h-3 w-3" />}
            {claimStatus === "VALIDATED" && <CheckCircle2 className="h-3 w-3" />}
            {claimStatus === "RELEASED" && <ShieldCheck className="h-3 w-3" />}
            {claimStatus === "REJECTED" && <XCircle className="h-3 w-3" />}
            {claimLabel}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <h3 className="min-h-10">
          <button
            type="button"
            onClick={() => onOpenDetails(item)}
            className="line-clamp-2 text-left text-[13px] font-medium leading-5 text-white/90 transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-white focus:outline-none"
          >
            {item.itemName}
          </button>
        </h3>

        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-[#8CB9F0]">
          <IdCard className="h-3.5 w-3.5 flex-shrink-0 text-[#62A0EA]" />
          <span className="truncate">{item.plateNumber || "Plate unavailable"}</span>
        </p>

        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-white/55">
          <Clock3 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{item.estimatedTimeLost || "Time unavailable"}</span>
        </p>
        <p className="mt-0.5 truncate text-[10px] text-white/40">Posted {formatDate(item.datePosted)}</p>
        {deadline && (
          <p
            className={`mt-1 truncate text-[11px] font-semibold ${deadline.isUrgent ? "text-amber-300" : "text-white/60"}`}
            title={`Claim by ${deadline.dateLabel}`}
          >
            {deadline.label}
          </p>
        )}

        <div className="mt-auto pt-2.5">
          {claimAction ? (
            <button
              type="button"
              onClick={claimAction.onClick}
              className={`relative z-10 h-8 w-full rounded-md border text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] ${claimAction.className}`}
            >
              {claimAction.label}
            </button>
          ) : (
            <div className={`flex h-8 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold ${claimStatus === "RELEASED" ? "border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#8CB9F0]" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {claimStatus === "RELEASED" ? "Claim completed" : "Ready for release"}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
