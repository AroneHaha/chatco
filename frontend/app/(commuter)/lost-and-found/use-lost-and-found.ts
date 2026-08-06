import { useState, useEffect, useCallback } from "react";
import { ItemCategory, ClaimFilter, ClaimStatus, LostItem, ClaimData, PaginatedAPIResponse, ViewTab } from "./types";
import { CLAIMS_PER_PAGE, ITEMS_PER_PAGE } from "./data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { RequestCancelledError } from "@/lib/api/client";
import {
  list as listItems,
  claim as claimItem,
  myClaims as fetchMyClaims,
  cancelClaim as apiCancelClaim,
  myWatchlist as fetchMyWatchlist,
  watch as apiWatch,
  unwatch as apiUnwatch,
  LostFoundOperationError,
  type BackendClaimStatus,
  type LostFoundItem,
} from "@/lib/shared/services/lost-found.service";

/** Server-side cap on `per_page` for Lost & Found list endpoints (see LostItemController). */
const MAX_PER_PAGE = 50;
/** Sanity ceiling on how many watchlist pages loadWatchlistIds() will walk, so a
 *  backend bug (e.g. lastPage that never converges) can't spin this into an
 *  infinite loop. 500 pages at MAX_PER_PAGE is 25,000 watchlisted items — far
 *  beyond any realistic commuter's list. */
const MAX_WATCHLIST_PAGES = 500;

/**
 * Sprint 6 (S6-T8) — Commuter Lost & Found hook, fully DB-backed.
 *
 *   list()        → GET    /api/v1/lost-found (paginated, category/search)
 *   claim()       → POST   /api/v1/lost-found/{id}/claim (proof of ownership)
 *   myClaims()    → GET    /api/v1/commuter/claims (item eager-loaded)
 *   cancelClaim() → DELETE /api/v1/lost-found/claims/{claimId}
 *   myWatchlist() → GET    /api/v1/commuter/watchlist (paginated)
 *   watch()       → POST   /api/v1/lost-found/{id}/watchlist
 *   unwatch()     → DELETE /api/v1/lost-found/{id}/watchlist
 *
 * ALL state that matters lives in the database:
 *   - Claims (badges, "My Claims" tab, cancel) come from
 *     GET /commuter/claims — they survive reloads and follow the commuter
 *     across devices. Cancel actually deletes the claim row server-side.
 *   - The watchlist is persisted per commuter; the heart toggle is optimistic
 *     (flips immediately, reverts if the API call fails).
 *
 * Tabs:
 *   ALL       → server-paginated browse list
 *   WATCHLIST → server-paginated GET /commuter/watchlist
 *   MY_CLAIMS → items attached to the commuter's own claims (no extra fetch)
 *
 * Claim status mapping (backend → UI): PENDING→PENDING, APPROVED→VALIDATED,
 * REJECTED→REJECTED. When a commuter has several claims on one item (e.g.
 * re-claimed after a rejection), the NEWEST claim wins.
 */
export function useLostAndFound() {
  const [activeTab, setActiveTab] = useState<ViewTab>("ALL");
  const [activeCategory, setActiveCategory] = useState<ItemCategory>("ALL");
  const [claimFilter, setClaimFilter] = useState<ClaimFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  // The input stays bound to `searchQuery` for instant keystroke feedback;
  // fetches key off the debounced value so typing doesn't fire a request
  // (and DB query) per keystroke.
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400);
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [itemToClaim, setItemToClaim] = useState<LostItem | null>(null);
  const [proofText, setProofText] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  // Cancel-claim confirmation flow: `claimToCancel` (an item id) drives the
  // confirmation modal — non-null means it's open for that item.
  // `isCancellingClaim` is true only once the user has confirmed and the
  // DELETE request + claims reload are actually in flight; it gates both
  // modal buttons so a rapid double-click on "Yes, Cancel Claim" can't fire
  // two requests. `cancelToast` is the post-success notification.
  const [claimToCancel, setClaimToCancel] = useState<string | null>(null);
  const [isCancellingClaim, setIsCancellingClaim] = useState(false);
  const [cancelToast, setCancelToast] = useState<string | null>(null);

  // DB-backed: watchlisted item ids (for the card hearts) + the commuter's
  // current claims page keyed by item id. Claims are loaded page-by-page.
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [claims, setClaims] = useState<Map<string, ClaimData>>(new Map());
  const [claimPageData, setClaimPageData] = useState({ totalPages: 1, totalItems: 0, currentPage: 1 });

  const [apiData, setApiData] = useState<PaginatedAPIResponse>({ items: [], totalPages: 1, totalItems: 0, currentPage: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  /** Backend claim status → the UI's ClaimStatus union. */
  const toUiClaimStatus = (backend: string): Exclude<ClaimStatus, "NONE"> => {
    if (backend === "APPROVED") return "VALIDATED";
    if (backend === "REJECTED") return "REJECTED";
    if (backend === "RELEASED") return "RELEASED";
    return "PENDING";
  };

  const toBackendClaimStatus = (filter: ClaimFilter): BackendClaimStatus | undefined => {
    if (filter === "PENDING") return "PENDING";
    if (filter === "VALIDATED") return "APPROVED";
    if (filter === "REJECTED") return "REJECTED";
    if (filter === "RELEASED") return "RELEASED";
    return undefined;
  };

  /** Reload one page of the commuter's own claims from the DB. */
  const loadClaims = useCallback(async (page = currentPage, filter = claimFilter, date = selectedDate, search = debouncedSearchQuery, signal?: AbortSignal) => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await fetchMyClaims({
        page,
        perPage: CLAIMS_PER_PAGE,
        status: toBackendClaimStatus(filter),
        date: date || undefined,
        search: search.trim() || undefined,
        signal,
      });
      const next = new Map<string, ClaimData>();
      // Rows are newest-first. Keep one visible card state per item on this page.
      for (const row of result.claims) {
        if (next.has(row.itemId)) continue;
        next.set(row.itemId, {
          claimId: row.id,
          status: toUiClaimStatus(row.status),
          proof: row.proof,
          claimDate: row.claimDate,
          reviewedAt: row.reviewedAt,
          approvedAt: row.approvedAt,
          rejectedAt: row.rejectedAt,
          releasedAt: row.releasedAt,
          rejectionReason: row.rejectionReason,
          item: row.item ? mapServiceItemToViewModel(row.item) : null,
        });
      }
      setClaims(next);
      setClaimPageData({
        totalPages: result.lastPage,
        totalItems: result.total,
        currentPage: result.page,
      });
      setIsLoading(false);
    } catch (err) {
      // A stale request cancelled in favor of a newer one — the newer
      // request owns isLoading/listError/claims from here, don't touch them.
      if (err instanceof RequestCancelledError) return;
      setListError("Unable to load your claims.");
      setClaims(new Map());
      setClaimPageData({ totalPages: 1, totalItems: 0, currentPage: page });
      setIsLoading(false);
    }
  }, [claimFilter, currentPage, selectedDate, debouncedSearchQuery]);

  /**
   * Reload the watchlisted item ids from the DB (for the card hearts).
   * Walks every page rather than assuming a fixed ceiling fits everyone —
   * a commuter with a very large watchlist still gets correct heart state.
   */
  const loadWatchlistIds = useCallback(async () => {
    try {
      const ids = new Set<string>();
      let page = 1;
      let lastPage = 1;
      do {
        const result = await fetchMyWatchlist({ page, perPage: MAX_PER_PAGE });
        for (const item of result.items) ids.add(item.id);
        lastPage = result.lastPage;
        page += 1;
      } while (page <= lastPage && page <= MAX_WATCHLIST_PAGES);
      setWatchlist(ids);
    } catch {
      // Non-fatal: hearts render unfilled until the next reload.
    }
  }, []);

  useEffect(() => { void loadWatchlistIds(); }, [loadWatchlistIds]);

  const fetchLostItems = useCallback(async (page: number, limit: number, category: ItemCategory, search: string, date: string, signal?: AbortSignal) => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await listItems({
        page,
        perPage: limit,
        category: category === "ALL" ? undefined : category,
        search: search.trim() || undefined,
        date: date || undefined,
        signal,
      });
      setApiData({
        items: result.items.map(mapServiceItemToViewModel),
        totalPages: result.lastPage,
        totalItems: result.total,
        currentPage: result.page,
      });
      setIsLoading(false);
    } catch (err) {
      if (err instanceof RequestCancelledError) return;
      setListError(err instanceof LostFoundOperationError ? err.message : "Unable to load items.");
      setApiData({ items: [], totalPages: 1, totalItems: 0, currentPage: page });
      setIsLoading(false);
    }
  }, []);

  const fetchWatchlistItems = useCallback(async (page: number, limit: number, date: string, search: string, signal?: AbortSignal) => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await fetchMyWatchlist({
        page,
        perPage: limit,
        date: date || undefined,
        search: search.trim() || undefined,
        signal,
      });
      setApiData({
        items: result.items.map(mapServiceItemToViewModel),
        totalPages: result.lastPage,
        totalItems: result.total,
        currentPage: result.page,
      });
      // Keep the heart id-set in sync with what the server returned.
      setWatchlist(prev => {
        const next = new Set(prev);
        for (const item of result.items) next.add(item.id);
        return next;
      });
      setIsLoading(false);
    } catch (err) {
      if (err instanceof RequestCancelledError) return;
      setListError(err instanceof LostFoundOperationError ? err.message : "Unable to load your watchlist.");
      setApiData({ items: [], totalPages: 1, totalItems: 0, currentPage: page });
      setIsLoading(false);
    }
  }, []);

  // Cancels the in-flight list request whenever the tab/filters change again
  // (or the component unmounts) before it resolves, so a slow earlier
  // response can never land after a faster later one and overwrite it with
  // stale data.
  useEffect(() => {
    const controller = new AbortController();
    if (activeTab === "MY_CLAIMS") {
      void loadClaims(currentPage, claimFilter, selectedDate, debouncedSearchQuery, controller.signal);
    } else if (activeTab === "WATCHLIST") {
      void fetchWatchlistItems(currentPage, ITEMS_PER_PAGE, selectedDate, debouncedSearchQuery, controller.signal);
    } else {
      void fetchLostItems(currentPage, ITEMS_PER_PAGE, activeCategory, debouncedSearchQuery, selectedDate, controller.signal);
    }
    return () => controller.abort();
  }, [activeTab, fetchLostItems, fetchWatchlistItems, loadClaims, currentPage, activeCategory, claimFilter, debouncedSearchQuery, selectedDate]);

  const handleTabChange = (tab: ViewTab) => { setActiveTab(tab); setActiveCategory("ALL"); setSearchQuery(""); setSelectedDate(""); setCurrentPage(1); };
  const handleCategoryChange = (cat: ItemCategory) => { setActiveCategory(cat); setCurrentPage(1); };
  const handleClaimFilterChange = (filter: ClaimFilter) => { setClaimFilter(filter); setCurrentPage(1); };
  const handleSearch = (val: string) => { setSearchQuery(val); setCurrentPage(1); };
  const handleDateChange = (date: string) => { setSelectedDate(date); setCurrentPage(1); };

  /** Local category/search filter for tabs whose data isn't server-filtered. */
  const matchesLocalFilters = (item: LostItem): boolean => {
    if (activeCategory !== "ALL" && item.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const fields = [
        item.itemName,
        item.description,
        item.plateNumber,
        item.driverName,
        item.conductorName,
      ];
      if (!fields.some((field) => field.toLowerCase().includes(q))) return false;
    }
    return true;
  };

  const displayItems: LostItem[] =
    activeTab === "MY_CLAIMS"
      ? Array.from(claims.values())
          .map(claim => claim.item)
          .filter((item): item is LostItem => item !== null)
          .filter(matchesLocalFilters)
      : activeTab === "WATCHLIST"
        ? apiData.items.filter(matchesLocalFilters)
        : apiData.items;

  const displayClaims: ClaimData[] = Array.from(claims.values())
    .filter(claim => claim.item ? matchesLocalFilters(claim.item) : true);

  /**
   * Optimistic watchlist toggle, persisted to the DB. The heart flips
   * immediately; if the API call fails the flip is reverted. On the
   * WATCHLIST tab, removing an item also refetches the tab's list.
   */
  const toggleWatchlist = (id: string) => {
    const wasWatched = watchlist.has(id);
    setWatchlist(prev => { const next = new Set(prev); if (wasWatched) next.delete(id); else next.add(id); return next; });
    void (async () => {
      try {
        if (wasWatched) await apiUnwatch(id);
        else await apiWatch(id);
        if (activeTab === "WATCHLIST") void fetchWatchlistItems(currentPage, ITEMS_PER_PAGE, selectedDate, debouncedSearchQuery);
      } catch {
        // Revert the optimistic flip.
        setWatchlist(prev => { const next = new Set(prev); if (wasWatched) next.add(id); else next.delete(id); return next; });
      }
    })();
  };

  const openClaimModal = (item: LostItem) => {
    setItemToClaim(item);
    setProofText("");
    setClaimError(null);
    setShowClaimModal(true);
  };

  /**
   * Submit the claim to POST /api/v1/lost-found/{id}/claim, then reload the
   * claims map from the DB (server truth — carries the claimId needed for
   * cancel). On 409 → inline "Item already claimed"; 422 → inline validation.
   */
  const submitClaim = async (): Promise<boolean> => {
    if (!itemToClaim || !proofText.trim()) return false;
    setIsSubmittingClaim(true);
    setClaimError(null);
    try {
      await claimItem(itemToClaim.id, { proof: proofText.trim() });
      await loadClaims(1, "ALL");
      setShowClaimModal(false);
      return true;
    } catch (err) {
      if (err instanceof LostFoundOperationError) {
        // 409 → "Item already claimed" (the backend rejects claims on
        // APPROVED/RELEASED/CLOSED items). 422 → proof validation.
        setClaimError(err.code === "conflict" ? "Item already claimed" : err.message);
      } else {
        setClaimError(err instanceof Error ? err.message : "Unable to submit claim.");
      }
      return false;
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Success toast auto-dismisses so it doesn't linger on screen.
  useEffect(() => {
    if (!cancelToast) return;
    const timer = setTimeout(() => setCancelToast(null), 2500);
    return () => clearTimeout(timer);
  }, [cancelToast]);

  /** Open the "Cancel this claim?" confirmation modal for an item. */
  const requestCancelClaim = (itemId: string) => {
    if (isCancellingClaim) return;
    setClaimToCancel(itemId);
  };

  /** Dismiss the confirmation modal without cancelling anything. */
  const closeCancelClaimModal = () => {
    if (isCancellingClaim) return;
    setClaimToCancel(null);
  };

  /**
   * Withdraw a PENDING claim — DELETE /lost-found/claims/{claimId} deletes
   * the row server-side, then the claims map is reloaded from the DB. If the
   * cancel fails (e.g. the admin approved it moments ago), reload anyway so
   * the card shows the real state.
   *
   * Only runs after the confirmation modal's "Yes, Cancel Claim" button.
   * `isCancellingClaim` gates both modal buttons so a rapid double-click
   * can't fire two DELETE requests for one claim.
   */
  const confirmCancelClaim = async () => {
    const itemId = claimToCancel;
    const existing = itemId ? claims.get(itemId) : undefined;
    if (!itemId || !existing || isCancellingClaim) return;
    setIsCancellingClaim(true);
    try {
      await apiCancelClaim(existing.claimId);
    } catch {
      // Fall through — the reload below resyncs to the DB's truth.
    }
    await loadClaims(currentPage, claimFilter);
    setIsCancellingClaim(false);
    setClaimToCancel(null);
    setCancelToast("Claim cancelled successfully.");
  };

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return dateStr; }
  };
  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case "PENDING": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "VALIDATED": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "REJECTED": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "RELEASED": return "bg-[#62A0EA]/20 text-[#8CB9F0] border-[#62A0EA]/30";
      default: return "";
    }
  };

  return {
    activeTab, handleTabChange, activeCategory, handleCategoryChange, claimFilter, handleClaimFilterChange, searchQuery, handleSearch,
    selectedDate, handleDateChange,
    currentPage, setCurrentPage, apiData, isLoading, listError,
    watchlist, toggleWatchlist, claims, claimPageData,
    openClaimModal,
    claimToCancel, requestCancelClaim, closeCancelClaimModal, confirmCancelClaim, isCancellingClaim, cancelToast,
    showClaimModal, setShowClaimModal, itemToClaim, proofText, setProofText,
    submitClaim, claimError, isSubmittingClaim,
    displayItems, displayClaims, formatDate, getStatusBadge,
  };
}

/** Map the shared service's LostFoundItem → the local LostItem view-model. */
function mapServiceItemToViewModel(item: LostFoundItem): LostItem {
  return {
    id: item.id,
    itemName: item.itemName,
    description: item.description,
    imageUrl: item.imageUrl,
    plateNumber: item.plateNumber,
    driverName: item.driverName,
    conductorName: item.conductorName,
    estimatedTimeLost: item.estimatedTimeLost,
    category: (item.category || "OTHER") as LostItem["category"],
    datePosted: item.datePosted,
  };
}
