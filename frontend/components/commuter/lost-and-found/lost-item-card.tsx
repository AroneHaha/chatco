import { LostItem, ClaimStatus } from "@/app/(commuter)/lost-and-found/types";

interface LostItemCardProps {
  item: LostItem;
  isWatched: boolean;
  claimStatus: ClaimStatus;
  claimLimitReached: boolean;
  onToggleWatchlist: (id: string) => void;
  onOpenClaimModal: (item: LostItem) => void;
  onCancelClaim: (id: string) => void;
  formatDate: (dateStr: string) => string;
  getStatusBadge: (status: ClaimStatus) => string;
}

export default function LostItemCard({ item, isWatched, claimStatus, claimLimitReached, onToggleWatchlist, onOpenClaimModal, onCancelClaim, formatDate, getStatusBadge }: LostItemCardProps) {
  return (
    <div className="bg-[#071A2E] rounded-2xl border border-white/10 overflow-hidden flex flex-col group hover:border-white/20 transition-all shadow-lg shadow-black/20">
      <div className="relative h-48 bg-[#0A1E33] overflow-hidden">
        <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
        <button onClick={() => onToggleWatchlist(item.id)} className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-sm border ${isWatched ? "bg-[#1A5FB4] border-[#62A0EA] shadow-lg shadow-[#1A5FB4]/40" : "bg-black/40 border-white/20 hover:bg-black/60"}`}>
          <svg className={`w-5 h-5 transition-colors ${isWatched ? "text-white fill-white" : "text-white/80"}`} fill={isWatched ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
        </button>
        <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">{item.category}</div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-white font-bold text-base leading-tight">{item.itemName}</h3>
          {claimStatus !== "NONE" && (<span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ml-2 flex-shrink-0 ${getStatusBadge(claimStatus)}`}>{claimStatus}</span>)}
        </div>
        <p className="text-white/40 text-xs mb-4 line-clamp-2 flex-grow">{item.description}</p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5 bg-white/5 rounded-xl p-3 border border-white/5">
          <div><p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Plate No.</p><p className="text-xs text-white/80 font-medium">{item.plateNumber}</p></div>
          <div><p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Est. Time</p><p className="text-xs text-white/80 font-medium">{item.estimatedTimeLost}</p></div>
          <div><p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Driver</p><p className="text-xs text-white/80 font-medium">{item.driverName}</p></div>
          <div><p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Conductor</p><p className="text-xs text-white/80 font-medium">{item.conductorName}</p></div>
        </div>

        <div className="flex items-center gap-3 mt-auto">
          {claimStatus === "NONE" ? (
            <button onClick={() => claimLimitReached ? null : onOpenClaimModal(item)} className={`flex-1 text-sm font-bold py-2.5 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 ${claimLimitReached ? "bg-white/5 text-white/30 cursor-not-allowed shadow-none" : "bg-[#FF6D3A] hover:bg-[#e55a2b] text-white shadow-[#FF6D3A]/30"}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {claimLimitReached ? "Claim Limit Reached" : "Claim Item"}
            </button>
          ) : claimStatus === "PENDING" ? (
            <button onClick={() => onCancelClaim(item.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-medium py-2.5 rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2">Cancel Claim</button>
          ) : (
            <div className="flex-1 bg-white/5 text-sm font-semibold py-2.5 rounded-xl text-center text-emerald-400">Validated - Proceed</div>
          )}
          <button onClick={() => onToggleWatchlist(item.id)} className={`w-11 h-11 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors ${isWatched ? "bg-[#1A5FB4]/20 border-[#62A0EA]/30 text-[#62A0EA]" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}>
            <svg className="w-5 h-5" fill={isWatched ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-white/20 mt-3">Posted on {formatDate(item.datePosted)}</p>
      </div>
    </div>
  );
}