// app/(admin)/lost-found/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { LostFoundGrid } from '@/components/admin/lost-found/lost-found-grid';
import { AddLostFoundModal } from '@/components/admin/lost-found/add-lost-found-modal';
import { ViewItemModal } from '@/components/admin/lost-found/view-item-modal';
import { ClaimsListModal } from '@/components/admin/lost-found/claims-list-modal';
import { Plus } from 'lucide-react';
import {
  itemCategoriesWithAll,
  type LostFoundItem,
  type Claim,
  type ItemCategory,
  type ItemStatus,
  type ClaimStatus,
} from '@/app/(admin)/lost-found/data/lost-found-data';
import type { LostFoundFormData } from '@/components/admin/lost-found/add-lost-found-modal';
import {
  listForAdmin,
  claimsForItem,
  report as reportItem,
  uploadImage as apiUploadImage,
  approveClaim as apiApproveClaim,
  releaseClaim as apiReleaseClaim,
  rejectClaim as apiRejectClaim,
  close as apiCloseItem,
  LostFoundOperationError,
  type LostFoundItem as ServiceItem,
  type LostFoundClaim as ServiceClaim,
} from '@/lib/shared/services/lost-found.service';

/**
 * Sprint 6 (S6-T8) — Admin Lost & Found management, wired to the real backend.
 *
 *   listForAdmin()  → GET /api/v1/admin/lost-items (items + claims eager-loaded)
 *   report()        → POST /api/v1/admin/lost-items (admin reports a new item)
 *   claimsForItem() → GET /api/v1/admin/lost-items/{id}/claims
 *   approveClaim()  → PATCH /api/v1/admin/lost-items/{id}/claims/{cid}/approve
 *   releaseClaim()  → PATCH /api/v1/admin/lost-items/{id}/claims/{cid}/release
 *   rejectClaim()   → PATCH /api/v1/admin/lost-items/{id}/claims/{cid}/reject
 *   close()         → PATCH /api/v1/admin/lost-items/{id}/close
 *
 * The grid shows items with their display status (Unmatched/Claimed/Released/
 * Closed) + claimed_by info (admin-only). The Claims modal fetches the full
 * claim list per item and offers Approve/Release/Reject actions. After each
 * action, the item list is refetched so the grid reflects the new status.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export default function LostFoundPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClaimsModalOpen, setIsClaimsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [claimsByItem, setClaimsByItem] = useState<Record<string, Claim[]>>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING_CLAIMS'>('ALL');
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  /** Fetch the admin list (items + claims eager-loaded) and refresh the grid. */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await listForAdmin({
        page: currentPage,
        perPage: ITEMS_PER_PAGE,
        category: activeCategory === 'ALL' ? undefined : activeCategory,
      });
      const mapped = result.items.map(mapServiceItemToAdmin);
      setItems(mapped);
      // Seed the claims map from the eager-loaded claims (so the Claims modal
      // has data immediately without a second round-trip).
      const next: Record<string, Claim[]> = {};
      for (const it of result.items) next[it.id] = (it.claims ?? []).map(mapServiceClaimToAdmin);
      setClaimsByItem(next);
    } catch (err) {
      setListError(err instanceof LostFoundOperationError ? err.message : 'Unable to load lost items.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, activeCategory]);

  useEffect(() => { void refresh(); }, [refresh]);

  const filteredItems = items.filter((item) => {
    if (activeTab === 'PENDING_CLAIMS') return item.status === 'Unmatched' || item.status === 'Claimed';
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!item.itemName.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const displayItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleOpenAddModal = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);
  const handleOpenClaimsModal = (itemId: string) => { setSelectedItemId(itemId); setIsClaimsModalOpen(true); };
  const handleCloseClaimsModal = () => { setSelectedItemId(null); setIsClaimsModalOpen(false); };
  const handleOpenDetailModal = (itemId: string) => { setSelectedItemId(itemId); setIsDetailModalOpen(true); };
  const handleCloseDetailModal = () => { setSelectedItemId(null); setIsDetailModalOpen(false); };

  /**
   * Admin reports a new lost item → POST /admin/lost-items, then uploads the
   * photo (if one was attached) via the multipart endpoint. The base64
   * preview is NEVER sent as image_url — the backend caps that column at 500
   * chars, so a data-URI would fail validation; the real file goes through
   * POST /admin/lost-items/{id}/image instead.
   */
  const handleSaveItem = async (newItem: LostFoundFormData) => {
    setActionError(null);
    try {
      const created = await reportItem({
        itemName: newItem.itemName,
        description: newItem.description,
        plateNumber: newItem.plateNumber || undefined,
        driverName: newItem.driverName || undefined,
        conductorName: newItem.conductorName || undefined,
        estimatedTimeLost: newItem.estimatedTimeLost || undefined,
        category: newItem.category,
      });
      if (newItem.imageFile) {
        try {
          await apiUploadImage(created.id, newItem.imageFile);
        } catch (err) {
          // The item exists — surface the photo failure without rolling back.
          setActionError(
            err instanceof LostFoundOperationError
              ? `Item created, but the photo failed to upload: ${err.message}`
              : 'Item created, but the photo failed to upload.'
          );
        }
      }
      setIsAddModalOpen(false);
      void refresh();
    } catch (err) {
      setActionError(err instanceof LostFoundOperationError ? err.message : 'Unable to report item.');
    }
  };

  /**
   * Admin claim action: Approve / Release / Reject.
   * Maps the modal's action labels to the backend endpoints. After a successful
   * action, refetch the claims for this item + refresh the grid so the status
   * badge updates.
   */
  const handleClaimAction = async (
    itemId: string,
    action: 'Approve' | 'Release' | 'Reject',
    claimId: string
  ) => {
    setActionError(null);
    setIsActing(true);
    try {
      if (action === 'Approve') {
        await apiApproveClaim(itemId, claimId);
      } else if (action === 'Release') {
        await apiReleaseClaim(itemId, claimId);
      } else if (action === 'Reject') {
        await apiRejectClaim(itemId, claimId);
      }
      // Refetch claims for this item + the full list (status changed).
      try {
        const fresh = await claimsForItem(itemId);
        setClaimsByItem((prev) => ({ ...prev, [itemId]: fresh.map(mapServiceClaimToAdmin) }));
      } catch { /* claims modal will show stale; non-fatal */ }
      void refresh();
      setIsClaimsModalOpen(false);
    } catch (err) {
      setActionError(err instanceof LostFoundOperationError ? err.message : 'Unable to process this claim.');
      throw err; // re-throw so the modal stays open on error
    } finally {
      setIsActing(false);
    }
  };

  /** Admin closes a released item (finalizes after handover). */
  const handleCloseItem = async (itemId: string) => {
    setActionError(null);
    setIsActing(true);
    try {
      await apiCloseItem(itemId);
      void refresh();
    } catch (err) {
      setActionError(err instanceof LostFoundOperationError ? err.message : 'Unable to close this item.');
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative">
      <div className="flex-shrink-0 bg-[#131C2E] border border-[#1E2D45] p-4 lg:px-8 lg:py-6 z-10 rounded-lg mb-6">
        <div className="flex flex-col sm:flex-row lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h1 className="text-white font-bold text-xl lg:text-2xl">Lost & Found Management</h1>
            <p className="text-slate-500 text-xs mt-1">{filteredItems.length} items • Page {currentPage} of {totalPages}</p>
          </div>
          <div className="flex items-center gap-2 w-full lg:w-fit flex-shrink-0">
            <div className="flex bg-[#0E1628] rounded-md p-1 border border-[#1E2D45] flex-1 lg:flex-none">
              {([ ["ALL", "All Items"], ["PENDING_CLAIMS", "Pending Claims"] ] as const).map(([key, label]) => (
                <button key={key} onClick={() => { setActiveTab(key); setCurrentPage(1); }} className={`flex-1 lg:flex-none px-3 py-2 rounded-md text-xs font-semibold transition-all text-center ${activeTab === key ? "bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30" : "text-slate-500 hover:text-slate-300 hover:bg-[#1A2540]"}`}>{label}</button>
              ))}
            </div>
            <button onClick={handleOpenAddModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-[#62A0EA] text-white text-xs font-semibold rounded-md hover:bg-[#4A8BD4] transition-colors shadow-lg shadow-[#62A0EA]/30 flex-shrink-0">
              <Plus size={16} /><span className="hidden xs:inline">Add Item</span>
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input type="text" placeholder="Search items, plates..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-[#0E1628] border border-[#1E2D45] rounded-md pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {itemCategoriesWithAll.map(cat => (
              <button key={cat.value} onClick={() => { setActiveCategory(cat.value); setCurrentPage(1); }} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeCategory === cat.value ? "bg-[#62A0EA] border-[#62A0EA] text-white" : "bg-transparent border-[#1E2D45] text-slate-500 hover:bg-[#1A2540]"}`}>{cat.label}</button>
            ))}
          </div>
        </div>
      </div>

      {actionError && (
        <div className="mx-4 lg:mx-8 mb-4 bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          <p className="text-red-400 text-xs font-medium">{actionError}</p>
          <button onClick={() => setActionError(null)} className="ml-auto text-red-400/60 hover:text-red-400 text-xs">Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-28 lg:pb-8">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#1E2D45] border-t-[#62A0EA] rounded-full animate-spin" />
            <p className="text-slate-500 text-sm mt-4">Loading items...</p>
          </div>
        ) : listError ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-red-400 font-medium text-sm mb-3">{listError}</p>
            <button onClick={() => void refresh()} className="px-4 py-2 rounded-md text-xs font-semibold bg-[#62A0EA] text-white">Try again</button>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <h3 className="text-slate-300 font-semibold mb-1">No items found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              <LostFoundGrid
                items={displayItems}
                onViewClaims={handleOpenClaimsModal}
                onViewDetails={handleOpenDetailModal}
                onClose={handleCloseItem}
                isActing={isActing}
              />
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 mb-4">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`px-4 py-2 rounded-md text-sm font-semibold ${currentPage === 1 ? "bg-[#0E1628] text-slate-600 cursor-not-allowed" : "bg-[#0E1628] border border-[#1E2D45] text-slate-400 hover:bg-[#1A2540]"}`}>Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 rounded-md text-sm font-semibold ${currentPage === page ? "bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30" : "bg-[#0E1628] border border-[#1E2D45] text-slate-400 hover:bg-[#1A2540]"}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className={`px-4 py-2 rounded-md text-sm font-semibold ${currentPage === totalPages ? "bg-[#0E1628] text-slate-600 cursor-not-allowed" : "bg-[#0E1628] border border-[#1E2D45] text-slate-400 hover:bg-[#1A2540]"}`}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      <ViewItemModal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} item={items.find((i) => i.id === selectedItemId) ?? null} />
      <AddLostFoundModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} onSave={handleSaveItem} />
      <ClaimsListModal
        isOpen={isClaimsModalOpen}
        onClose={handleCloseClaimsModal}
        itemId={selectedItemId || ''}
        claims={selectedItemId ? (claimsByItem[selectedItemId] ?? []) : []}
        onClaimAction={handleClaimAction}
      />
    </div>
  );
}

// ─── Mappers: shared service → admin data types ─────────────────────

function mapServiceItemToAdmin(item: ServiceItem): LostFoundItem {
  return {
    id: item.id,
    itemName: item.itemName,
    description: item.description,
    imageUrl: item.imageUrl,
    plateNumber: item.plateNumber,
    driverName: item.driverName,
    conductorName: item.conductorName,
    estimatedTimeLost: item.estimatedTimeLost,
    category: (item.category || 'OTHER') as ItemCategory,
    datePosted: item.datePosted,
    reporterName: item.reporterName,
    status: item.displayStatus as ItemStatus,
    claimedBy: item.claimedBy,
  };
}

function mapServiceClaimToAdmin(claim: ServiceClaim): Claim {
  return {
    id: claim.id,
    itemId: claim.itemId,
    claimantName: claim.claimantName,
    claimantContact: claim.claimantContact,
    claimantEmail: claim.claimantEmail ?? undefined,
    claimDate: claim.claimDate,
    status: claim.displayStatus as ClaimStatus,
    proof: claim.proof,
  };
}
