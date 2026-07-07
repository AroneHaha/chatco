import { useState, useEffect, useCallback } from "react";
import { ItemCategory, ClaimStatus, LostItem, ClaimData, PaginatedAPIResponse, ViewTab } from "./types";
import { ITEMS_PER_PAGE, MAX_PENDING_CLAIMS } from "./data";
import {
  list as listItems,
  claim as claimItem,
  myClaims as fetchMyClaims,
  cancelClaim as apiCancelClaim,
  myWatchlist as fetchMyWatchlist,
  watch as apiWatch,
  unwatch as apiUnwatch,
  LostFoundOperationError,
  type LostFoundItem,
} from "@/lib/shared/services/lost-found.service";

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
 *   - Claims (badges, the 3-pending cap, "My Claims" tab, cancel) come from
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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [itemToClaim, setItemToClaim] = useState<LostItem | null>(null);
  const [proofText, setProofText] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // DB-backed: watchlisted item ids (for the card hearts) + the commuter's
  // own claims keyed by item id. Both loaded on mount, refreshed after writes.
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [claims, setClaims] = useState<Map<string, ClaimData>>(new Map());

  const [apiData, setApiData] = useState<PaginatedAPIResponse>({ items: [], totalPages: 1, totalItems: 0, currentPage: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const pendingClaimsCount = Array.from(claims.values()).filter(c => c.status === "PENDING").length;

  /** Backend claim status → the UI's ClaimStatus union. */
  const toUiClaimStatus = (backend: string): ClaimStatus => {
    if (backend === "APPROVED") return "VALIDATED";
    if (backend === "REJECTED") return "REJECTED";
    return "PENDING";
  };

  /** Reload the commuter's own claims from the DB (newest claim per item wins). */
  const loadClaims = useCallback(async () => {
    try {
      const rows = await fetchMyClaims();
      const next = new Map<string, ClaimData>();
      // rows are newest-first — keep only the first (newest) claim per item.
      for (const row of rows) {
        if (next.has(row.itemId)) continue;
        next.set(row.itemId, {
          claimId: row.id,
          status: toUiClaimStatus(row.status),
          proof: row.proof,
          item: row.item ? mapServiceItemToViewModel(row.item) : null,
        });
      }
      setClaims(next);
    } catch {
      // Non-fatal: cards just show no claim badges until the next reload.
    }
  }, []);

  /** Reload the watchlisted item ids from the DB (for the card hearts). */
  const loadWatchlistIds = useCallback(async () => {
    try {
      const result = await fetchMyWatchlist({ perPage: 100 });
      setWatchlist(new Set(result.items.map((item) => item.id)));
    } catch {
      // Non-fatal: hearts render unfilled until the next reload.
    }
  }, []);

  useEffect(() => { void loadClaims(); void loadWatchlistIds(); }, [loadClaims, loadWatchlistIds]);

  const fetchLostItems = useCallback(async (page: number, limit: number, category: ItemCategory, search: string) => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await listItems({
        page,
        perPage: limit,
        category: category === "ALL" ? undefined : category,
        search: search.trim() || undefined,
      });
      setApiData({
        items: result.items.map(mapServiceItemToViewModel),
        totalPages: result.lastPage,
        totalItems: result.total,
        currentPage: result.page,
      });
    } catch (err) {
      setListError(err instanceof LostFoundOperationError ? err.message : "Unable to load items.");
      setApiData({ items: [], totalPages: 1, totalItems: 0, currentPage: page });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchWatchlistItems = useCallback(async (page: number, limit: number) => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await fetchMyWatchlist({ page, perPage: limit });
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
    } catch (err) {
      setListError(err instanceof LostFoundOperationError ? err.message : "Unable to load your watchlist.");
      setApiData({ items: [], totalPages: 1, totalItems: 0, currentPage: page });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "MY_CLAIMS") {
      // Claim items come from the claims map (already loaded from the DB).
      setIsLoading(false);
      setListError(null);
      return;
    }
    if (activeTab === "WATCHLIST") {
      void fetchWatchlistItems(currentPage, ITEMS_PER_PAGE);
      return;
    }
    void fetchLostItems(currentPage, ITEMS_PER_PAGE, activeCategory, searchQuery);
  }, [activeTab, fetchLostItems, fetchWatchlistItems, currentPage, activeCategory, searchQuery]);

  const handleTabChange = (tab: ViewTab) => { setActiveTab(tab); setActiveCategory("ALL"); setSearchQuery(""); setCurrentPage(1); };
  const handleCategoryChange = (cat: ItemCategory) => { setActiveCategory(cat); setCurrentPage(1); };
  const handleSearch = (val: string) => { setSearchQuery(val); setCurrentPage(1); };

  /** Local category/search filter for tabs whose data isn't server-filtered. */
  const matchesLocalFilters = (item: LostItem): boolean => {
    if (activeCategory !== "ALL" && item.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!item.itemName.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
    }
    return true;
  };

  const displayItems: LostItem[] =
    activeTab === "MY_CLAIMS"
      ? Array.from(claims.values())
          .map(c => c.item)
          .filter((item): item is LostItem => item !== null)
          .filter(matchesLocalFilters)
      : activeTab === "WATCHLIST"
        ? apiData.items.filter(matchesLocalFilters)
        : apiData.items;

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
        if (activeTab === "WATCHLIST") void fetchWatchlistItems(currentPage, ITEMS_PER_PAGE);
      } catch {
        // Revert the optimistic flip.
        setWatchlist(prev => { const next = new Set(prev); if (wasWatched) next.add(id); else next.delete(id); return next; });
      }
    })();
  };

  const openClaimModal = (item: LostItem) => {
    if (pendingClaimsCount >= MAX_PENDING_CLAIMS) return;
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
  const submitClaim = async () => {
    if (!itemToClaim || !proofText.trim()) return;
    setIsSubmittingClaim(true);
    setClaimError(null);
    try {
      await claimItem(itemToClaim.id, { proof: proofText.trim() });
      await loadClaims();
      setShowClaimModal(false);
    } catch (err) {
      if (err instanceof LostFoundOperationError) {
        // 409 → "Item already claimed" (the backend rejects claims on
        // APPROVED/RELEASED/CLOSED items). 422 → proof validation.
        setClaimError(err.code === "conflict" ? "Item already claimed" : err.message);
      } else {
        setClaimError(err instanceof Error ? err.message : "Unable to submit claim.");
      }
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  /**
   * Withdraw a PENDING claim — DELETE /lost-found/claims/{claimId} deletes
   * the row server-side, then the claims map is reloaded from the DB. If the
   * cancel fails (e.g. the admin approved it moments ago), reload anyway so
   * the card shows the real state.
   */
  const cancelClaim = (itemId: string) => {
    const existing = claims.get(itemId);
    if (!existing) return;
    void (async () => {
      try {
        await apiCancelClaim(existing.claimId);
      } catch {
        // Fall through — the reload below resyncs to the DB's truth.
      }
      await loadClaims();
    })();
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
      default: return "";
    }
  };

  return {
    activeTab, handleTabChange, activeCategory, handleCategoryChange, searchQuery, handleSearch,
    currentPage, setCurrentPage, apiData, isLoading, listError,
    watchlist, toggleWatchlist, claims, pendingClaimsCount,
    openClaimModal, cancelClaim,
    showClaimModal, setShowClaimModal, itemToClaim, proofText, setProofText,
    submitClaim, claimError, isSubmittingClaim,
    displayItems, formatDate, getStatusBadge, MAX_PENDING_CLAIMS,
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
