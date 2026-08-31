// app/(admin)/lost-found/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { RequestCancelledError } from '@/lib/api/client';
import { LostFoundGrid } from '@/components/admin/lost-found/lost-found-grid';
import { AddLostFoundModal } from '@/components/admin/lost-found/add-lost-found-modal';
import { EditLostFoundModal, type EditLostFoundFormData } from '@/components/admin/lost-found/edit-lost-found-modal';
import { ViewItemModal } from '@/components/admin/lost-found/view-item-modal';
import { ClaimsListModal } from '@/components/admin/lost-found/claims-list-modal';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  History,
  PackageSearch,
  Plus,
  Search,
} from 'lucide-react';
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
  recordManualClaim,
  report as reportItem,
  update as apiUpdateItem,
  addPhoto as apiAddPhoto,
  deletePhoto as apiDeletePhoto,
  reactivate as apiReactivateItem,
  approveClaim as apiApproveClaim,
  releaseClaim as apiReleaseClaim,
  rejectClaim as apiRejectClaim,
  close as apiCloseItem,
  LostFoundOperationError,
  type LostFoundItem as ServiceItem,
  type LostFoundClaim as ServiceClaim,
} from '@/lib/shared/services/lost-found.service';

type AdminTab = 'ALL' | 'PENDING_CLAIMS' | 'TO_RELEASE' | 'HISTORY' | 'EXPIRED';
type PageMeta = { page: number; lastPage: number; total: number };
type ViewedClaimMarkers = Record<string, string>;

const VIEWED_CLAIMS_STORAGE_KEY = 'chatco.admin.lostFound.viewedPendingClaims.v1';

function pendingClaimSignature(claims: Claim[]): string {
  return claims
    .filter((claim) => claim.status === 'Pending')
    .map((claim) => claim.id)
    .sort()
    .join('|');
}

function readViewedClaimMarkers(): ViewedClaimMarkers {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VIEWED_CLAIMS_STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as ViewedClaimMarkers
      : {};
  } catch {
    return {};
  }
}

/**
 * Sprint 6 (S6-T8) — Admin Lost & Found management, wired to the real backend.
 *
 *   listForAdmin()  → GET /api/v1/admin/lost-items (items + claims eager-loaded)
 *   report()        → POST /api/v1/admin/lost-items (admin reports a new item)
 *   update()        → PATCH /api/v1/admin/lost-items/{id} (edit descriptive fields)
 *   addPhoto()      → POST /api/v1/admin/lost-items/{id}/photos (up to 3)
 *   deletePhoto()   → DELETE /api/v1/admin/lost-items/{id}/photos/{pid}
 *   reactivate()    → PATCH /api/v1/admin/lost-items/{id}/reactivate (EXPIRED → AVAILABLE)
 *   claimsForItem() → GET /api/v1/admin/lost-items/{id}/claims
 *   approveClaim()  → PATCH /api/v1/admin/lost-items/{id}/claims/{cid}/approve
 *   releaseClaim()  → PATCH /api/v1/admin/lost-items/{id}/claims/{cid}/release
 *   rejectClaim()   → PATCH /api/v1/admin/lost-items/{id}/claims/{cid}/reject
 *   close()         → PATCH /api/v1/admin/lost-items/{id}/close
 *
 * The grid shows items with their display status (Unmatched/Claimed/Released/
 * Closed/Expired) + claimed_by info (admin-only). The Claims modal fetches the
 * full claim list per item and offers Approve/Release/Reject actions. History
 * (Released+Closed) and Expired are server-filtered tabs — everything else is
 * fetched unfiltered and split client-side.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export default function LostFoundPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isClaimsModalOpen, setIsClaimsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [claimsByItem, setClaimsByItem] = useState<Record<string, Claim[]>>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<LostFoundItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [pageMeta, setPageMeta] = useState<PageMeta>({ page: 1, lastPage: 1, total: 0 });
  const [viewedClaimMarkers, setViewedClaimMarkers] = useState<ViewedClaimMarkers>(readViewedClaimMarkers);
  // Mobile-only: collapses the tab grid + filter row down to just the title
  // and Add Item button, same collapse pattern as the conductor dashboard's
  // MobileDashboardCard. Has no effect at md: and up (always expanded there).
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(true);

  const [activeTab, setActiveTab] = useState<AdminTab>('ALL');
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  // The input stays bound to `searchQuery` for instant keystroke feedback;
  // the fetch keys off the debounced value so typing doesn't fire a request
  // (and DB query) per keystroke.
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400);
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  /** Fetch the admin list (items + claims eager-loaded) and refresh the grid.
   * History (Released+Closed) and Expired are filtered server-side so their
   * pagination is correct — older historical/expired items aren't hidden on
   * a later page of the unfiltered "All Items" fetch.
   *
   * Accepts an optional `signal` so the driving effect can cancel a stale
   * request when the tab/filters change again before it resolves — without
   * this, a slow earlier response could land after a faster later one and
   * overwrite the grid with stale data. */
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await listForAdmin({
        page: currentPage,
        perPage: ITEMS_PER_PAGE,
        category: activeCategory === 'ALL' ? undefined : activeCategory,
        search: debouncedSearchQuery.trim() || undefined,
        date: selectedDate || undefined,
        signal,
        ...(activeTab === 'ALL' ? { statuses: ['AVAILABLE', 'CLAIMED'] } : {}),
        ...(activeTab === 'EXPIRED' ? { status: 'EXPIRED' } : {}),
        ...(activeTab === 'HISTORY' ? { status: 'CLOSED' } : {}),
        ...(activeTab === 'PENDING_CLAIMS' ? { status: 'CLAIMED' } : {}),
        ...(activeTab === 'TO_RELEASE' ? { status: 'APPROVED' } : {}),
      });
      const mapped = result.items.map(mapServiceItemToAdmin);
      setItems(mapped);
      setPageMeta({ page: result.page, lastPage: result.lastPage, total: result.total });
      // Seed the claims map from the eager-loaded claims (so the Claims modal
      // has data immediately without a second round-trip).
      const next: Record<string, Claim[]> = {};
      for (const it of result.items) next[it.id] = (it.claims ?? []).map(mapServiceClaimToAdmin);
      setClaimsByItem(next);
      setIsLoading(false);
    } catch (err) {
      // A stale request cancelled in favor of a newer one — the newer
      // request owns isLoading/listError/items from here, don't touch them.
      if (err instanceof RequestCancelledError) return;
      setListError(err instanceof LostFoundOperationError ? err.message : 'Unable to load lost items.');
      setItems([]);
      setPageMeta({ page: currentPage, lastPage: 1, total: 0 });
      setIsLoading(false);
    }
  }, [currentPage, activeCategory, activeTab, debouncedSearchQuery, selectedDate]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  /** Merge a freshly-mutated item (from update/addPhoto/deletePhoto) back into
   * the currently-loaded list without a full refetch — keeps the detail modal
   * responsive while adding/removing photos. */
  const upsertItemInState = useCallback((updated: ServiceItem): LostFoundItem => {
    const mapped = mapServiceItemToAdmin(updated);
    setItems((prev) => prev.map((it) => (it.id === mapped.id ? mapped : it)));
    return mapped;
  }, []);

  const filteredItems = items.filter((item) => {
    const itemClaims = claimsByItem[item.id] ?? [];
    const pendingClaims = itemClaims.filter((claim) => claim.status === 'Pending').length;
    const approvedClaims = itemClaims.filter((claim) => claim.status === 'Approved').length;

    if (activeTab === 'ALL' && item.status === 'Closed') return false;
    if (activeTab === 'PENDING_CLAIMS' && pendingClaims === 0) return false;
    if (activeTab === 'TO_RELEASE' && approvedClaims === 0) return false;
    if (activeTab === 'HISTORY' && item.status !== 'Closed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !item.itemName.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q) &&
        !item.plateNumber.toLowerCase().includes(q) &&
        !item.driverName.toLowerCase().includes(q) &&
        !item.conductorName.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, pageMeta.lastPage);
  const displayItems = filteredItems;
  const rangeFrom = pageMeta.total === 0 ? 0 : (pageMeta.page - 1) * ITEMS_PER_PAGE + 1;
  const rangeTo = Math.min(pageMeta.page * ITEMS_PER_PAGE, pageMeta.total);
  const claimSummaries = Object.fromEntries(
    Object.entries(claimsByItem).map(([itemId, itemClaims]) => {
      const pendingSignature = pendingClaimSignature(itemClaims);
      return [
        itemId,
        {
        total: itemClaims.length,
        pending: itemClaims.filter((claim) => claim.status === 'Pending').length,
        approved: itemClaims.filter((claim) => claim.status === 'Approved').length,
        accepted: itemClaims.filter((claim) => claim.status === 'Approved' || claim.status === 'Released' || claim.status === 'Returned').length,
          hasNewPending: pendingSignature !== '' && viewedClaimMarkers[itemId] !== pendingSignature,
        },
      ];
    }),
  );
  const tabs: { key: AdminTab; label: string; description: string; icon: typeof PackageSearch }[] = [
    { key: 'ALL', label: 'All Items', description: 'Open inventory', icon: PackageSearch },
    { key: 'PENDING_CLAIMS', label: 'Claim Review', description: 'New and pending only', icon: ClipboardList },
    { key: 'TO_RELEASE', label: 'To Be Released', description: 'Approved for handover', icon: CheckCircle2 },
    { key: 'HISTORY', label: 'History', description: 'Closed records only', icon: History },
    { key: 'EXPIRED', label: 'Expired', description: 'Archived records', icon: Archive },
  ];

  const handleOpenAddModal = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);
  const markClaimsViewed = useCallback((itemId: string) => {
    const signature = pendingClaimSignature(claimsByItem[itemId] ?? []);
    setViewedClaimMarkers((prev) => {
      const next = { ...prev, [itemId]: signature };
      try {
        window.localStorage.setItem(VIEWED_CLAIMS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Best-effort only; the in-memory state still clears the indicator.
      }
      return next;
    });
  }, [claimsByItem]);

  const handleOpenClaimsModal = (itemId: string) => {
    markClaimsViewed(itemId);
    setSelectedItemId(itemId);
    setIsClaimsModalOpen(true);
  };
  const handleCloseClaimsModal = () => { setSelectedItemId(null); setIsClaimsModalOpen(false); };
  const handleOpenDetailModal = (itemId: string) => { setSelectedItemId(itemId); setIsDetailModalOpen(true); };
  const handleCloseDetailModal = () => { setSelectedItemId(null); setIsDetailModalOpen(false); };
  const handleOpenEditModal = (item: LostFoundItem) => { setEditingItem(item); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setEditingItem(null); setIsEditModalOpen(false); };

  /**
   * Admin reports a new lost item → POST /admin/lost-items, then uploads each
   * attached photo (up to 3) via the multipart endpoint, sequentially so
   * position ordering (0 = thumbnail) matches the order photos were added.
   * The base64 previews are NEVER sent as image_url — the backend caps that
   * column at 500 chars, so a data-URI would fail validation; the real files
   * go through POST /admin/lost-items/{id}/photos instead.
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
      if (newItem.imageFiles.length > 0) {
        try {
          for (const file of newItem.imageFiles) {
            await apiAddPhoto(created.id, file);
          }
        } catch (err) {
          // The item exists — surface the photo failure without rolling back.
          setActionError(
            err instanceof LostFoundOperationError
              ? `Item created, but a photo failed to upload: ${err.message}`
              : 'Item created, but a photo failed to upload.'
          );
        }
      }
      setIsAddModalOpen(false);
      void refresh();
    } catch (err) {
      setActionError(err instanceof LostFoundOperationError ? err.message : 'Unable to report item.');
    }
  };

  /** Admin edits a reported item's descriptive fields (blocked once CLOSED). */
  const handleSaveEdit = async (itemId: string, data: EditLostFoundFormData) => {
    const updated = await apiUpdateItem(itemId, {
      itemName: data.itemName,
      description: data.description,
      plateNumber: data.plateNumber || undefined,
      driverName: data.driverName || undefined,
      conductorName: data.conductorName || undefined,
      estimatedTimeLost: data.estimatedTimeLost || undefined,
      category: data.category,
    });
    upsertItemInState(updated);
  };

  /** Add a photo to an item (up to 3) — used by the detail view's gallery. */
  const handleAddPhoto = async (itemId: string, file: File) => {
    setActionError(null);
    try {
      const updated = await apiAddPhoto(itemId, file);
      upsertItemInState(updated);
    } catch (err) {
      setActionError(err instanceof LostFoundOperationError ? err.message : 'Unable to add this photo.');
    }
  };

  /** Remove a photo from an item — used by the detail view's gallery. */
  const handleDeletePhoto = async (itemId: string, photoId: string) => {
    setActionError(null);
    try {
      const updated = await apiDeletePhoto(itemId, photoId);
      upsertItemInState(updated);
    } catch (err) {
      setActionError(err instanceof LostFoundOperationError ? err.message : 'Unable to remove this photo.');
    }
  };

  /** Bring an auto-expired item back to AVAILABLE (a claimant turned up late). */
  const handleReactivateItem = async (itemId: string) => {
    setActionError(null);
    setIsActing(true);
    try {
      await apiReactivateItem(itemId);
      handleCloseDetailModal();
      void refresh();
    } catch (err) {
      setActionError(err instanceof LostFoundOperationError ? err.message : 'Unable to reactivate this item.');
    } finally {
      setIsActing(false);
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
    } catch (err) {
      setActionError(err instanceof LostFoundOperationError ? err.message : 'Unable to process this claim.');
      throw err; // re-throw so the modal stays open on error
    } finally {
      setIsActing(false);
    }
  };

  const handleRecordManualClaim = async (
    itemId: string,
    input: { name: string; contact?: string; email?: string; proof: string },
  ) => {
    setActionError(null);
    await recordManualClaim(itemId, input);
    const fresh = await claimsForItem(itemId);
    setClaimsByItem((prev) => ({ ...prev, [itemId]: fresh.map(mapServiceClaimToAdmin) }));
    await refresh();
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
    <div className="h-[calc(100%+2rem)] w-[calc(100%+2rem)] flex flex-col overflow-hidden relative -mx-4 -mt-4 md:h-full md:w-full md:mx-0 md:mt-0">
      {/* Header. On phones it breaks out of <main>'s padding to sit flush at the
          top edge-to-edge (like the shared sticky header). On desktop it drops
          the boxed-card look and becomes a borderless, transparent full-width
          header — flush to the content edges like every other admin module —
          with just a full-width bottom divider. */}
      <div className="z-10 mb-4 flex-shrink-0 border-b border-white/10 bg-[#071A2E] p-4 md:mb-6 md:rounded-none md:bg-transparent md:px-0 md:pt-0 md:pb-5">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#62A0EA]/20 bg-[#1A5FB4]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8CB9F0]">
              <PackageSearch className="h-3.5 w-3.5" />
              Admin workspace
            </div>
            <h1 className="text-xl font-bold leading-tight text-white lg:text-2xl">Lost & Found Management</h1>
            <p className="mt-1 text-xs text-slate-500">{pageMeta.total} records | Page {pageMeta.page} of {totalPages}</p>
          </div>
          {/* Below lg: the filter row stays a stacked column (no "right side" to
              align to yet), so Add Item stays up here — outside the mobile
              collapse below, so it's still reachable even while filters are
              collapsed on phones. From lg: up, the row below goes horizontal
              and this same action moves there instead (see the lg:-only
              instance further down), right-aligned with the filters. */}
          <button
            onClick={handleOpenAddModal}
            className="inline-flex h-9.5 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#FF6D3A] px-4 text-sm font-bold text-white shadow-lg shadow-[#FF6D3A]/25 transition-colors hover:bg-[#e55a2b] sm:w-auto lg:hidden"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        {/* Mobile-only collapse: tab grid + filter row hide behind a toggle so
            just the title and Add Item button stay visible on small screens —
            same pattern as the conductor dashboard's MobileDashboardCard. The
            md:!max-h-none override means this never collapses at md: and up.
            overflow-hidden is only needed to actually crop content to zero
            height while collapsed below md: — left on unconditionally it
            also clips anything absolutely-positioned that opens from inside
            here (the date picker's popover) even once expanded. So it only
            stays hidden while genuinely collapsed; md:overflow-visible covers
            md: and up unconditionally, since content is always expanded
            there regardless of this mobile-only toggle's state. */}
        <div
          className={`transition-all duration-300 ease-in-out md:overflow-visible md:max-h-none! ${isMobileFiltersExpanded ? 'overflow-visible' : 'overflow-hidden'}`}
          style={{ maxHeight: isMobileFiltersExpanded ? '700px' : '0px' }}
        >
          <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
            {tabs.map(({ key, label, description, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setActiveTab(key); setCurrentPage(1); }}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  activeTab === key
                    ? 'border-[#62A0EA]/45 bg-[#1A5FB4]/20 text-white shadow-lg shadow-[#1A5FB4]/15'
                    : 'border-white/10 bg-[#0E1628] text-slate-400 hover:bg-[#131C2E] hover:text-white'
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#62A0EA]" />
                  <span className="text-xs font-bold">{label}</span>
                </div>
                <p className="text-[10px] text-slate-500">{description}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 lg:w-100">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search item, plate, driver, or conductor..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="h-8.25 w-full rounded-xl border border-white/10 bg-[#0E1628] pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-[#62A0EA]"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <AdminDatePicker
                accent="blue"
                ariaLabel="Filter lost items by posted date"
                value={selectedDate}
                onChange={(next) => { setSelectedDate(next); setCurrentPage(1); }}
                triggerClassName="h-8.25 w-full sm:w-44"
                className="w-full sm:w-44"
              />
              <div className="relative sm:w-48">
                <select
                  value={activeCategory}
                  onChange={(e) => { setActiveCategory(e.target.value as ItemCategory | 'ALL'); setCurrentPage(1); }}
                  className="h-8.25 w-full appearance-none rounded-xl border border-white/10 bg-[#0E1628] px-4 pr-10 text-sm font-semibold text-slate-300 outline-none transition-colors focus:border-[#62A0EA]"
                  aria-label="Filter lost items by category"
                >
                  {itemCategoriesWithAll.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
              {/* lg:-only counterpart to the header's Add Item button above —
                  once the row goes horizontal there's a real "right side" to
                  align it to, flush with the filters at the same height. Width
                  matches the Add Vehicle/Driver/Conductor buttons elsewhere in
                  admin for a consistent "add" action size across modules. */}
              <button
                onClick={handleOpenAddModal}
                className="hidden h-8.25 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#FF6D3A] px-4 text-sm font-bold text-white shadow-lg shadow-[#FF6D3A]/25 transition-colors hover:bg-[#e55a2b] lg:inline-flex lg:w-44"
              >
                <Plus size={16} />
                Add Item
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileFiltersExpanded((prev) => !prev)}
          aria-expanded={isMobileFiltersExpanded}
          aria-label={isMobileFiltersExpanded ? 'Collapse filters' : 'Expand filters'}
          className="-mx-4 -mb-4 mt-2 flex w-[calc(100%+2rem)] flex-shrink-0 items-center justify-center border-t border-white/5 py-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 active:bg-white/10 md:hidden"
        >
          <ChevronUp className={`h-4 w-4 transition-transform duration-300 ${isMobileFiltersExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {actionError && (
        <div className="mx-4 md:mx-0 mb-4 bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          <p className="text-red-400 text-xs font-medium">{actionError}</p>
          <button onClick={() => setActionError(null)} className="ml-auto text-red-400/60 hover:text-red-400 text-xs">Dismiss</button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col px-4 md:px-0">
        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-5 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-[430px] rounded-xl border border-white/10 bg-white/[0.04]">
                  <div className="h-full w-full animate-pulse rounded-[inherit] bg-gradient-to-r from-white/[0.03] via-white/[0.07] to-white/[0.03]" />
                </div>
              ))}
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
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              <LostFoundGrid
                items={displayItems}
                claimSummaries={claimSummaries}
                onViewClaims={handleOpenClaimsModal}
                onViewDetails={handleOpenDetailModal}
                onEdit={handleOpenEditModal}
                onClose={handleCloseItem}
                onReactivate={handleReactivateItem}
                isActing={isActing}
              />
            </div>
          )}
        </div>

        {/* Pagination — outside the scrollable area above, so it never scrolls out of view. */}
        {!isLoading && !listError && displayItems.length > 0 && (
          <div className="flex-shrink-0 bg-[#0E1628] border border-white/10 rounded-lg px-3 pb-3">
            <TablePagination
              currentPage={pageMeta.page}
              totalPages={totalPages}
              from={rangeFrom}
              to={rangeTo}
              total={pageMeta.total}
              label="items"
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <ViewItemModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        item={items.find((i) => i.id === selectedItemId) ?? null}
        onEdit={(item) => { handleCloseDetailModal(); handleOpenEditModal(item); }}
        onReactivate={handleReactivateItem}
        onAddPhoto={handleAddPhoto}
        onDeletePhoto={handleDeletePhoto}
        isActing={isActing}
      />
      <AddLostFoundModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} onSave={handleSaveItem} />
      <EditLostFoundModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} item={editingItem} onSave={handleSaveEdit} />
      <ClaimsListModal
        isOpen={isClaimsModalOpen}
        onClose={handleCloseClaimsModal}
        itemId={selectedItemId || ''}
        claims={selectedItemId ? (claimsByItem[selectedItemId] ?? []) : []}
        releasedByName={items.find((i) => i.id === selectedItemId)?.closedByName ?? null}
        onClaimAction={handleClaimAction}
        onRecordManualClaim={handleRecordManualClaim}
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
    closedByName: item.closedByName,
    expiredAt: item.expiredAt,
    photos: item.photos,
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
    approvedAt: claim.approvedAt,
    rejectedAt: claim.rejectedAt,
    releasedAt: claim.releasedAt,
    reviewedByName: claim.reviewedByName,
    proof: claim.proof,
    linkedAccount: claim.linkedAccount,
  };
}
