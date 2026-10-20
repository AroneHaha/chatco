// app/(admin)/lost-found/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { RequestCancelledError } from '@/lib/api/client';
import { LostFoundGrid, SelectCheckbox } from '@/components/admin/lost-found/lost-found-grid';
import { AddLostFoundModal } from '@/components/admin/lost-found/add-lost-found-modal';
import { EditLostFoundModal, type EditLostFoundFormData } from '@/components/admin/lost-found/edit-lost-found-modal';
import { ViewItemModal } from '@/components/admin/lost-found/view-item-modal';
import { ClaimsListModal } from '@/components/admin/lost-found/claims-list-modal';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import { PageTabs } from '@/components/admin/ui/page-tabs';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { StickyPageHeader } from '@/components/admin/layout/sticky-page-header';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  History,
  PackageSearch,
  Plus,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  XCircle,
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
  replacePhoto as apiReplacePhoto,
  reactivate as apiReactivateItem,
  reactivateMany as apiReactivateItems,
  approveClaim as apiApproveClaim,
  releaseClaim as apiReleaseClaim,
  rejectClaim as apiRejectClaim,
  close as apiCloseItem,
  LostFoundOperationError,
  type LostFoundItem as ServiceItem,
  type LostFoundClaim as ServiceClaim,
  type PickupSchedule,
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
  const searchParams = useSearchParams();
  const notificationItemId = searchParams.get('itemId');
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
  // Phones only: the date/category filters fold behind a Filters button while
  // search stays visible, same as User Management. Always shown from md: up.
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(false);

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

  // Expired tab multi-select for bulk reactivation. Kept across pages so the
  // desk can gather items from several pages, but cleared whenever the tab
  // or a filter changes, so nothing hidden by the new filter stays selected.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkReactivating, setIsBulkReactivating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const selectionKey = `${activeTab}|${activeCategory}|${debouncedSearchQuery}|${selectedDate}`;
  const [selectionFor, setSelectionFor] = useState(selectionKey);
  if (selectionKey !== selectionFor) {
    setSelectionFor(selectionKey);
    setSelectedIds(new Set());
  }

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
      setClaimsByItem((prev) => ({
        ...(notificationItemId && prev[notificationItemId] ? { [notificationItemId]: prev[notificationItemId] } : {}),
        ...next,
      }));
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
  }, [currentPage, activeCategory, activeTab, debouncedSearchQuery, selectedDate, notificationItemId]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (!notificationItemId) return;
    let cancelled = false;
    // Fetch the referenced item's claims through the existing admin endpoint,
    // even when the item is outside the current grid filters or page.
    void claimsForItem(notificationItemId).then((claims) => {
      if (cancelled) return;
      const mapped = claims.map(mapServiceClaimToAdmin);
      setClaimsByItem((prev) => ({ ...prev, [notificationItemId]: mapped }));
      setSelectedItemId(notificationItemId);
      setIsClaimsModalOpen(true);
    }).catch((error) => {
      if (!cancelled) setActionError(error instanceof Error ? error.message : 'Unable to load this claim.');
    });
    return () => { cancelled = true; };
  }, [notificationItemId]);

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
    { key: 'EXPIRED', label: 'Archived', description: 'Expired, unclaimed items', icon: Archive },
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

  /** Photo changes staged in the edit modal, applied one at a time on Save.
   * Unlike the detail view's handlers above these re-throw, so the modal can
   * stop at the failing change, show it inline, and keep the rest staged. */
  const handleEditAddPhoto = async (itemId: string, file: File) => {
    upsertItemInState(await apiAddPhoto(itemId, file));
  };
  const handleEditReplacePhoto = async (itemId: string, photoId: string, file: File) => {
    upsertItemInState(await apiReplacePhoto(itemId, photoId, file));
  };
  const handleEditDeletePhoto = async (itemId: string, photoId: string) => {
    upsertItemInState(await apiDeletePhoto(itemId, photoId));
  };

  /** Bring an auto-expired item back to AVAILABLE (a claimant turned up late). */
  const handleReactivateItem = async (itemId: string) => {
    setActionError(null);
    setIsActing(true);
    try {
      await apiReactivateItem(itemId);
      handleCloseDetailModal();
      setSelectedIds((prev) => {
        if (!prev.has(itemId)) return prev;
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      void refresh();
    } catch (err) {
      setActionError(err instanceof LostFoundOperationError ? err.message : 'Unable to reactivate this item.');
    } finally {
      setIsActing(false);
    }
  };

  const toggleSelected = (itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  /** Reactivate every selected Expired item in one bulk request. */
  const handleBulkReactivate = async () => {
    if (selectedIds.size === 0 || isBulkReactivating) return;
    setActionError(null);
    setActionNotice(null);
    setIsBulkReactivating(true);
    setIsActing(true);
    try {
      const { reactivated, skipped } = await apiReactivateItems([...selectedIds]);
      const done = `${reactivated.length} item${reactivated.length === 1 ? '' : 's'} reactivated and back in All Items.`;
      setActionNotice(skipped.length > 0
        ? `${done} ${skipped.length} skipped because ${skipped.length === 1 ? 'it was' : 'they were'} no longer expired.`
        : done);
      setSelectedIds(new Set());
      void refresh();
    } catch (err) {
      // Keep the selection so the desk can retry.
      setActionError(err instanceof LostFoundOperationError ? err.message : 'Unable to reactivate the selected items.');
    } finally {
      setIsBulkReactivating(false);
      setIsActing(false);
    }
  };

  /**
   * Admin claim action: Approve / Release / Reject.
   * Maps the modal's action labels to the backend endpoints.
   *
   * Resolves as soon as the action itself succeeds: the acted-on claim is
   * patched straight from the endpoint's response, so the modal closes and
   * the grid updates immediately. The item's full claim list (approve
   * auto-rejects other pending claims) and the grid are then reconciled in
   * the background, in parallel. Previously the modal waited on a second,
   * sequential claims fetch before closing, which is what made Release feel
   * slow.
   */
  const handleClaimAction = async (
    itemId: string,
    action: 'Approve' | 'Release' | 'Reject',
    claimId: string,
    pickup?: PickupSchedule,
  ) => {
    setActionError(null);
    setIsActing(true);
    try {
      const updated = action === 'Approve'
        ? await apiApproveClaim(itemId, claimId, pickup)
        : action === 'Release'
          ? await apiReleaseClaim(itemId, claimId)
          : await apiRejectClaim(itemId, claimId);
      const updatedClaim = mapServiceClaimToAdmin(updated);
      setClaimsByItem((prev) => ({
        ...prev,
        [itemId]: (prev[itemId] ?? []).map((claim) => (claim.id === claimId ? updatedClaim : claim)),
      }));
      void claimsForItem(itemId)
        .then((fresh) => setClaimsByItem((prev) => ({ ...prev, [itemId]: fresh.map(mapServiceClaimToAdmin) })))
        .catch(() => { /* the grid refresh below still reseeds claims; non-fatal */ });
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

  const activeTabMeta = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const filterControlClasses = 'h-11 w-full min-w-0 appearance-none rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white px-3 pr-9 text-base text-white admin-light:text-slate-900 focus:outline-none focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4]/50 focus:ring-1 focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30 scheme-dark admin-light:scheme-light md:w-48 md:text-sm';

  return (
    <div className="flex h-full min-h-[32rem] min-w-0 flex-col md:min-h-0">
      {/* Same page chrome as User Management / Fleet: plain sticky title,
          shared underline tabs with the primary action on their line, then
          one filter row. */}
      <StickyPageHeader className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-white admin-light:text-slate-900 md:text-2xl">Lost & Found Management</h1>
      </StickyPageHeader>

      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#1E2D45] admin-light:border-[#E2E8F0]">
        <div className="min-w-0 basis-full md:flex-1 md:basis-auto">
          <PageTabs
            className="border-b-0! [&>button]:min-h-11 [&>button]:flex-none"
            activeId={activeTab}
            onChange={(id) => { setActiveTab(id); setCurrentPage(1); }}
            tabs={tabs.map(({ key, label, icon }) => ({ id: key, label, icon }))}
          />
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="ml-auto inline-flex h-11 w-full -translate-y-1 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-4 sm:w-44 text-sm font-bold text-white shadow-lg shadow-[#62A0EA]/25 admin-light:shadow-[#1A5FB4]/25 transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] active:scale-[0.98]"
        >
          <Plus size={16} aria-hidden="true" />
          Add Item
        </button>
      </div>

      <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-2 lg:w-80 lg:shrink-0">
          <SearchBar
            placeholder="Search item, plate, driver, or conductor..."
            value={searchQuery}
            onChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
            className="min-w-0 flex-1 [&_input]:h-11 [&_input]:text-base md:[&_input]:text-sm"
          />
          <button
            type="button"
            onClick={() => setIsMobileFiltersExpanded((prev) => !prev)}
            aria-expanded={isMobileFiltersExpanded}
            aria-controls="lost-found-filters"
            className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors md:hidden ${isMobileFiltersExpanded ? 'border-[#62A0EA]/40 admin-light:border-[#1A5FB4]/40 bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10 text-[#62A0EA] admin-light:text-[#1A5FB4]' : 'border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white text-slate-300 admin-light:text-slate-700'}`}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filters
            <ChevronUp size={14} className={isMobileFiltersExpanded ? '' : 'rotate-180'} aria-hidden="true" />
          </button>
        </div>

        <div id="lost-found-filters" className={`${isMobileFiltersExpanded ? 'grid' : 'hidden'} grid-cols-2 gap-2 md:flex md:items-center md:gap-3 lg:ml-auto`}>
          <AdminDatePicker
            accent="blue"
            align="right"
            popover
            yearNavigation
            ariaLabel="Filter lost items by posted date"
            value={selectedDate}
            onChange={(next) => { setSelectedDate(next); setCurrentPage(1); }}
            triggerClassName="h-11 w-full md:w-44"
            className="w-full md:w-44"
          />
          <div className="relative min-w-0">
            <select
              value={activeCategory}
              onChange={(e) => { setActiveCategory(e.target.value as ItemCategory | 'ALL'); setCurrentPage(1); }}
              className={filterControlClasses}
              aria-label="Filter lost items by category"
            >
              {itemCategoriesWithAll.map(cat => (
                <option key={cat.value} value={cat.value} className="bg-[#0E1628] admin-light:bg-white">
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* What the tab holds and where the list stands, kept from the old tab
          tiles and header line. */}
      <p className="mb-3 shrink-0 text-xs text-slate-500">
        <span className="text-slate-300 admin-light:text-slate-700">{activeTabMeta.description}</span>
        <span aria-hidden="true"> · </span>
        {pageMeta.total} records
        <span aria-hidden="true"> · </span>
        Page {pageMeta.page} of {totalPages}
      </p>

      {actionNotice && (
        <div role="status" className="mb-4 flex shrink-0 items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400 admin-light:text-emerald-700" aria-hidden="true" />
          <p className="text-sm text-emerald-400 admin-light:text-emerald-700">{actionNotice}</p>
          <button type="button" onClick={() => setActionNotice(null)} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-400/70 admin-light:text-emerald-700 hover:text-emerald-300 admin-light:hover:text-emerald-800">
            <XCircle size={14} aria-hidden="true" />
            Dismiss
          </button>
        </div>
      )}

      {/* Expired tab: bulk selection bar. Appears once a card is ticked (the
          cards' own checkboxes start a selection), and sits outside the
          scrolling grid so it stays in reach however far down the desk is. */}
      {activeTab === 'EXPIRED' && selectedIds.size > 0 && !isLoading && !listError && displayItems.length > 0 && (() => {
        const selectedOnPage = displayItems.filter((item) => selectedIds.has(item.id)).length;
        const allOnPage = selectedOnPage === displayItems.length;
        const offPage = selectedIds.size - selectedOnPage;
        return (
          <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white px-3 py-2.5">
            <SelectCheckbox
              checked={allOnPage}
              indeterminate={selectedOnPage > 0}
              disabled={isBulkReactivating}
              showLabel
              label="Select all on this page"
              onChange={() => setSelectedIds((prev) => {
                const next = new Set(prev);
                for (const item of displayItems) {
                  if (allOnPage) next.delete(item.id);
                  else next.add(item.id);
                }
                return next;
              })}
            />
            <p className="text-xs text-slate-500" aria-live="polite">
              <span className="font-semibold tabular-nums text-slate-200 admin-light:text-slate-800">{selectedIds.size}</span> selected{offPage > 0 && <> ({offPage} on other pages)</>}
            </p>
            <button type="button" onClick={() => setSelectedIds(new Set())} disabled={isBulkReactivating} className="text-xs font-medium text-slate-400 admin-light:text-slate-500 underline-offset-2 hover:text-white admin-light:hover:text-slate-900 hover:underline disabled:opacity-50">
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => void handleBulkReactivate()}
              disabled={isBulkReactivating}
              className="ml-auto inline-flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 admin-light:text-emerald-700 transition-colors hover:bg-emerald-500/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            >
              {isBulkReactivating
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                : <RotateCcw size={14} aria-hidden="true" />}
              {isBulkReactivating ? 'Reactivating...' : `Reactivate selected (${selectedIds.size})`}
            </button>
          </div>
        );
      })()}

      {actionError && (
        <div role="alert" className="mb-4 flex shrink-0 items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3">
          <AlertCircle size={16} className="shrink-0 text-red-400 admin-light:text-red-600" aria-hidden="true" />
          <p className="text-sm text-red-400 admin-light:text-red-600">{actionError}</p>
          <button type="button" onClick={() => setActionError(null)} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-red-400/70 admin-light:text-red-600 hover:text-red-300 admin-light:hover:text-red-700">
            <XCircle size={14} aria-hidden="true" />
            Dismiss
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto pb-4 scrollbar-themed">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4" aria-busy="true" aria-label="Loading lost items">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white">
                  <div className="aspect-4/3 w-full animate-pulse bg-[#0E1628] admin-light:bg-[#F1F5F9] motion-reduce:animate-none" />
                  <div className="space-y-2.5 p-3 sm:p-4">
                    <div className="h-2.5 w-1/3 animate-pulse rounded bg-[#1A2540] admin-light:bg-[#EEF2F7] motion-reduce:animate-none" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#1A2540] admin-light:bg-[#EEF2F7] motion-reduce:animate-none" />
                    <div className="h-3 w-full animate-pulse rounded bg-[#1A2540]/70 admin-light:bg-[#EEF2F7] motion-reduce:animate-none" />
                    <div className="grid grid-cols-2 gap-3 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-3">
                      <div className="h-6 animate-pulse rounded bg-[#1A2540]/70 admin-light:bg-[#EEF2F7] motion-reduce:animate-none" />
                      <div className="h-6 animate-pulse rounded bg-[#1A2540]/70 admin-light:bg-[#EEF2F7] motion-reduce:animate-none" />
                    </div>
                  </div>
                  <div className="h-10 border-t border-[#1E2D45] admin-light:border-[#E2E8F0]" />
                </div>
              ))}
            </div>
          ) : listError ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-red-400/20 bg-red-400/5 p-8">
              <AlertCircle size={36} className="text-red-400 admin-light:text-red-600" aria-hidden="true" />
              <p className="text-center text-sm font-medium text-red-400 admin-light:text-red-600">{listError}</p>
              <button type="button" onClick={() => void refresh()} className="flex items-center gap-2 rounded-md bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F]">
                <RefreshCw size={16} aria-hidden="true" /> Try again
              </button>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[#1E2D45] admin-light:border-[#E2E8F0] px-4 text-center">
              <PackageSearch size={36} className="mb-3 text-slate-600 admin-light:text-slate-400" aria-hidden="true" />
              <h3 className="mb-1 font-semibold text-slate-300 admin-light:text-slate-700">No items found</h3>
              <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
              <LostFoundGrid
                items={displayItems}
                claimSummaries={claimSummaries}
                onViewClaims={handleOpenClaimsModal}
                onViewDetails={handleOpenDetailModal}
                onEdit={handleOpenEditModal}
                onClose={handleCloseItem}
                onReactivate={handleReactivateItem}
                isActing={isActing}
                selectable={activeTab === 'EXPIRED'}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelected}
              />
            </div>
          )}
        </div>

        {/* Pagination — outside the scrollable area above, so it never scrolls out of view. */}
        {!isLoading && !listError && displayItems.length > 0 && (
          <div className="shrink-0">
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
      <EditLostFoundModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        item={editingItem}
        // `editingItem` is the snapshot the form was seeded from; photos come
        // from the live list so each applied change shows up immediately.
        photos={(editingItem && items.find((i) => i.id === editingItem.id)?.photos) ?? editingItem?.photos ?? []}
        onSave={handleSaveEdit}
        onAddPhoto={handleEditAddPhoto}
        onReplacePhoto={handleEditReplacePhoto}
        onDeletePhoto={handleEditDeletePhoto}
      />
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
    pickupLocation: claim.pickupLocation,
    pickupAt: claim.pickupAt,
    pickupReminder: claim.pickupReminder,
    noShowAt: claim.noShowAt,
    proof: claim.proof,
    proofPhotos: claim.proofPhotos,
    linkedAccount: claim.linkedAccount,
  };
}
