import { useState, useEffect, useCallback } from "react";
import { ItemCategory, ClaimStatus, LostItem, ClaimData, PaginatedAPIResponse, ViewTab } from "./types";
import { ITEMS_PER_PAGE, MAX_PENDING_CLAIMS } from "./data";
import {
  list as listItems,
  claim as claimItem,
  LostFoundOperationError,
  type LostFoundItem,
} from "@/lib/shared/services/lost-found.service";

/**
 * Sprint 6 (S6-T8) — Commuter Lost & Found hook, wired to the real backend.
 *
 *   list()    → GET /api/v1/lost-found (paginated, filterable by category/search)
 *   claim()   → POST /api/v1/lost-found/{id}/claim (proof of ownership)
 *
 * State machine:
 *   browse (list) → open claim modal → submit claim → 201 → row shows "PENDING"
 *                                            ↓ 409/422
 *                                       inline error in modal
 *
 * The hook owns: list filters (tab/category/search/page), the claim modal
 * state (item + proof text + error), the commuter's own claims map (so the
 * UI can mark rows the commuter has already claimed), and the loading/error
 * state for the list. The watchlist is kept as local-only state for now
 * (the backend watchlist endpoints exist but wiring them is out of T8 scope;
 * T8 covers report/claim/confirm/resolve).
 *
 * The view-model shape is kept compatible with the existing page + card
 * components (LostItem camelCase interface) so the UI didn't need rewriting.
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

  // Watchlist is local-only for now (backend watchlist endpoints exist but
  // are out of T8 scope). Starts empty; toggled by the commuter.
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  // The commuter's own claims, keyed by item id. Used to mark rows + cap
  // concurrent pending claims at MAX_PENDING_CLAIMS.
  const [claims, setClaims] = useState<Map<string, ClaimData>>(new Map());

  const [apiData, setApiData] = useState<PaginatedAPIResponse>({ items: [], totalPages: 1, totalItems: 0, currentPage: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const pendingClaimsCount = Array.from(claims.values()).filter(c => c.status === "PENDING").length;

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

  useEffect(() => { fetchLostItems(currentPage, ITEMS_PER_PAGE, activeCategory, searchQuery); }, [fetchLostItems, currentPage, activeCategory, searchQuery]);

  const handleTabChange = (tab: ViewTab) => { setActiveTab(tab); setActiveCategory("ALL"); setSearchQuery(""); setCurrentPage(1); };
  const handleCategoryChange = (cat: ItemCategory) => { setActiveCategory(cat); setCurrentPage(1); };
  const handleSearch = (val: string) => { setSearchQuery(val); setCurrentPage(1); };

  const displayItems = apiData.items.filter(item => {
    if (activeTab === "WATCHLIST") return watchlist.has(item.id);
    if (activeTab === "MY_CLAIMS") return claims.has(item.id);
    return true;
  });

  const toggleWatchlist = (id: string) => { setWatchlist(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };

  const openClaimModal = (item: LostItem) => {
    if (pendingClaimsCount >= MAX_PENDING_CLAIMS) return;
    setItemToClaim(item);
    setProofText("");
    setClaimError(null);
    setShowClaimModal(true);
  };

  /**
   * Submit the claim to POST /api/v1/lost-found/{id}/claim.
   * On 201 → add to the claims map (PENDING) + close the modal.
   * On 409 (already claimed) → inline "Item already claimed".
   * On 422 → inline validation message. On network → inline retry prompt.
   */
  const submitClaim = async () => {
    if (!itemToClaim || !proofText.trim()) return;
    setIsSubmittingClaim(true);
    setClaimError(null);
    try {
      await claimItem(itemToClaim.id, { proof: proofText.trim() });
      setClaims(prev => {
        const next = new Map(prev);
        next.set(itemToClaim.id, { status: "PENDING", proof: proofText.trim() });
        return next;
      });
      setShowClaimModal(false);
    } catch (err) {
      if (err instanceof LostFoundOperationError) {
        // 409 → "Item already claimed" (the backend rejects claims on
        // CLAIMED/APPROVED/RELEASED/CLOSED items). 422 → proof validation.
        setClaimError(err.code === "conflict" ? "Item already claimed" : err.message);
      } else {
        setClaimError(err instanceof Error ? err.message : "Unable to submit claim.");
      }
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const cancelClaim = (id: string) => { setClaims(prev => { const next = new Map(prev); next.delete(id); return next; }); };

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
