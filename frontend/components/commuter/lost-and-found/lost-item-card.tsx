import { LostItem, ClaimStatus } from "@/app/(commuter)/lost-and-found/types";
import {
  Bookmark,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  IdCard,
  PackageSearch,
  ShieldCheck,
  UserRound,
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

  const primaryAction =
    claimStatus === "PENDING"
      ? { label: "Cancel Claim", onClick: () => onCancelClaim(item.id), className: "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white" }
      : claimStatus === "REJECTED"
        ? { label: "Claim Again", onClick: () => onOpenClaimModal(item), className: "border-[#FF6D3A]/30 bg-[#FF6D3A] text-white hover:bg-[#e55a2b]" }
        : claimStatus === "VALIDATED" || claimStatus === "RELEASED"
          ? null
          : { label: "Claim Item", onClick: () => onOpenClaimModal(item), className: "border-[#FF6D3A]/30 bg-[#FF6D3A] text-white hover:bg-[#e55a2b]" };

  return (
    <article className="group flex min-h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#071A2E] shadow-lg shadow-black/20 transition-colors hover:border-[#62A0EA]/35">
      <button type="button" onClick={() => onOpenDetails(item)} className="relative aspect-[4/3] w-full overflow-hidden bg-[#0A1E33] text-left">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.itemName} className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-100" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/20">
            <PackageSearch className="h-11 w-11" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">No photo yet</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">{item.category}</span>
          {claimLabel && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${getStatusBadge(claimStatus)}`}>
              {claimStatus === "PENDING" && <Clock3 className="h-3 w-3" />}
              {claimStatus === "VALIDATED" && <CheckCircle2 className="h-3 w-3" />}
              {claimStatus === "RELEASED" && <ShieldCheck className="h-3 w-3" />}
              {claimStatus === "REJECTED" && <XCircle className="h-3 w-3" />}
              {claimLabel}
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 pt-12">
          <p className="line-clamp-1 text-base font-bold leading-tight text-white">{item.itemName}</p>
          <p className="mt-1 line-clamp-1 text-xs text-white/60">Posted {formatDate(item.datePosted)}</p>
        </div>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <p className="mb-3 line-clamp-2 min-h-10 text-sm leading-5 text-white/55">{item.description}</p>

        <div className="mb-4 grid gap-2 rounded-lg border border-white/8 bg-white/[0.04] p-3">
          <div className="flex items-center gap-2 text-xs text-white/75">
            <IdCard className="h-3.5 w-3.5 flex-shrink-0 text-[#62A0EA]" />
            <span className="min-w-0 truncate">{item.plateNumber || "Plate unavailable"}</span>
            <span className="mx-1 h-1 w-1 flex-shrink-0 rounded-full bg-white/20" />
            <Clock3 className="h-3.5 w-3.5 flex-shrink-0 text-[#62A0EA]" />
            <span className="min-w-0 truncate">{item.estimatedTimeLost || "Time unavailable"}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/45">
            <UserRound className="h-3.5 w-3.5 flex-shrink-0 text-white/30" />
            <span className="min-w-0 truncate">{item.driverName || "Driver unavailable"}</span>
            <span className="mx-1 h-1 w-1 flex-shrink-0 rounded-full bg-white/15" />
            <span className="min-w-0 truncate">{item.conductorName || "Conductor unavailable"}</span>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-[1fr_2.5rem_2.5rem] gap-2">
          {claimStatus === "VALIDATED" || claimStatus === "RELEASED" ? (
            <div className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold ${claimStatus === "RELEASED" ? "border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#8CB9F0]" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}>
              <ShieldCheck className="h-4 w-4" />
              {claimStatus === "RELEASED" ? "Released" : "Validated"}
            </div>
          ) : (
            <button
              onClick={primaryAction?.onClick}
              className={`h-10 rounded-lg border px-3 text-sm font-bold shadow-lg shadow-black/10 transition-colors ${primaryAction?.className}`}
            >
              {primaryAction?.label}
            </button>
          )}
          <button type="button" onClick={() => onOpenDetails(item)} aria-label={`View ${item.itemName}`} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => onToggleWatchlist(item.id)} aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"} className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${isWatched ? "border-[#62A0EA]/35 bg-[#1A5FB4]/20 text-[#62A0EA]" : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}>
            <Bookmark className={`h-4 w-4 ${isWatched ? "fill-current" : ""}`} />
          </button>
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-white/25">
          {claimStatus === "REJECTED" ? <XCircle className="h-3 w-3" /> : <FileCheck2 className="h-3 w-3" />}
          {claimStatus === "RELEASED" ? "Claim completed" : claimStatus === "NONE" ? "Available to claim" : "Claim status saved"}
        </p>
      </div>
    </article>
  );
}
