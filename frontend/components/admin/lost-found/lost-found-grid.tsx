// components/admin/lost-found/lost-found-grid.tsx
import { Badge } from '@/components/admin/ui/badge';
import {
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  IdCard,
  ListChecks,
  PackageSearch,
  Pencil,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import type { LostFoundItem } from '@/app/(admin)/lost-found/data/lost-found-data';

interface LostFoundGridProps {
  items: LostFoundItem[];
  claimSummaries?: Record<string, { total: number; pending: number; accepted: number; hasNewPending?: boolean }>;
  onViewClaims: (itemId: string) => void;
  onViewDetails: (itemId: string) => void;
  onEdit: (item: LostFoundItem) => void;
  onClose?: (itemId: string) => void;
  onReactivate?: (itemId: string) => void;
  isActing?: boolean;
}

function formatPostedDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getBadgeVariant(status: LostFoundItem['status']): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'Released':
    case 'Returned':
    case 'Closed':
      return 'success';
    case 'Claimed':
      return 'info';
    case 'Expired':
    case 'Rejected':
      return 'danger';
    default:
      return 'warning';
  }
}

export function LostFoundGrid({ items, claimSummaries = {}, onViewClaims, onViewDetails, onEdit, onClose, onReactivate, isActing }: LostFoundGridProps) {
  return (
    <>
      {items.map((item) => {
        const claimSummary = claimSummaries[item.id] ?? { total: 0, pending: 0, accepted: 0 };
        const hasNewClaims = Boolean(claimSummary.hasNewPending);
        const isClaimed = claimSummary.accepted > 0 || item.status === 'Released' || item.status === 'Closed';

        return (
        <article key={item.id} className="group flex min-h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#071A2E] shadow-lg shadow-black/20 transition-colors hover:border-[#62A0EA]/35">
          <button type="button" onClick={() => onViewDetails(item.id)} className="relative aspect-[4/3] w-full overflow-hidden bg-[#0A1E33] text-left">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.itemName} className="h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-100" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-600">
                <PackageSearch className="h-11 w-11" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">No photo yet</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-3">
              <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">{item.category}</span>
              <Badge variant={getBadgeVariant(item.status)}>{item.status}</Badge>
            </div>
          </button>

          <div className="flex flex-1 flex-col p-4">
            <div className="mb-3">
              <button type="button" onClick={() => onViewDetails(item.id)} className="block w-full text-left">
                <h3 className="line-clamp-1 text-base font-bold leading-tight text-white transition-colors group-hover:text-[#8CB9F0]">{item.itemName}</h3>
              </button>
              <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-slate-400">{item.description}</p>
            </div>

            <div className="mb-3 grid gap-2 rounded-lg border border-white/8 bg-white/[0.04] p-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <IdCard className="h-3.5 w-3.5 text-[#62A0EA]" />
                <span className="min-w-0 truncate">{item.plateNumber || 'Plate unavailable'}</span>
                <span className="mx-1 h-1 w-1 rounded-full bg-white/20" />
                <Clock3 className="h-3.5 w-3.5 text-[#62A0EA]" />
                <span className="min-w-0 truncate">{item.estimatedTimeLost || 'Time unavailable'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <UserRound className="h-3.5 w-3.5 text-slate-500" />
                <span className="min-w-0 truncate">{item.driverName || 'Driver unavailable'}</span>
                <span className="mx-1 h-1 w-1 rounded-full bg-white/15" />
                <span className="min-w-0 truncate">{item.conductorName || 'Conductor unavailable'}</span>
              </div>
            </div>

            <div className="mt-auto grid grid-cols-3 gap-2">
              <button onClick={() => onViewDetails(item.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
                <Eye className="h-4 w-4" />
                Details
              </button>
              <button
                onClick={() => onViewClaims(item.id)}
                className={`relative inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors ${
                  hasNewClaims
                    ? 'border-[#FF6D3A]/35 bg-[#FF6D3A]/10 text-white hover:bg-[#FF6D3A]/15'
                    : isClaimed
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {hasNewClaims && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-[#071A2E] bg-[#FF6D3A]" />}
                {isClaimed ? <UserRound className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                {isClaimed ? 'Claimed' : 'Claims'}
                <span className={`ml-0.5 min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  hasNewClaims
                    ? 'bg-[#FF6D3A] text-white'
                    : isClaimed
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-white/10 text-slate-400'
                }`}>
                  {claimSummary.total}
                </span>
              </button>
              <button onClick={() => onEdit(item)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            </div>

            {onClose && item.status === 'Released' && (
              <button
                onClick={() => onClose(item.id)}
                disabled={isActing}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Close after handover
              </button>
            )}

            {onReactivate && item.status === 'Expired' && (
              <button
                onClick={() => onReactivate(item.id)}
                disabled={isActing}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reactivate item
              </button>
            )}

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
              <FileCheck2 className="h-3 w-3" />
              Posted {formatPostedDate(item.datePosted)}
            </p>
          </div>
        </article>
        );
      })}
    </>
  );
}
