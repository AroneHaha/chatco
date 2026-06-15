import { useState, useEffect } from "react";
import { ItemCategory, ClaimStatus, LostItem, ClaimData, PaginatedAPIResponse, ViewTab } from "./types";
import { mockDatabase, ITEMS_PER_PAGE, MAX_PENDING_CLAIMS } from "./data";

export function useLostAndFound() {
  const [activeTab, setActiveTab] = useState<ViewTab>("ALL");
  const [activeCategory, setActiveCategory] = useState<ItemCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [itemToClaim, setItemToClaim] = useState<LostItem | null>(null);
  const [proofText, setProofText] = useState("");

  const [watchlist, setWatchlist] = useState<Set<string>>(new Set(["lf_004"])); 
  const [claims, setClaims] = useState<Map<string, ClaimData>>(new Map([["lf_005", { status: "PENDING", proof: "It has my signature on page 3" }]])); 

  const [apiData, setApiData] = useState<PaginatedAPIResponse>({ items: [], totalPages: 1, totalItems: 0, currentPage: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const pendingClaimsCount = Array.from(claims.values()).filter(c => c.status === "PENDING").length;

  const fetchLostItems = async (page: number, limit: number, category: ItemCategory, search: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network

    let filteredItems = [...mockDatabase];
    if (category !== "ALL") filteredItems = filteredItems.filter(item => item.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.itemName.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.plateNumber.toLowerCase().includes(q)
      );
    }

    filteredItems.sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime());

    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const indexOfLast = page * limit;
    const indexOfFirst = indexOfLast - limit;

    setApiData({ items: filteredItems.slice(indexOfFirst, indexOfLast), totalPages, totalItems, currentPage: page });
    setIsLoading(false);
  };

  useEffect(() => { fetchLostItems(currentPage, ITEMS_PER_PAGE, activeCategory, searchQuery); }, [currentPage, activeCategory, searchQuery]);

  const handleTabChange = (tab: ViewTab) => { setActiveTab(tab); setActiveCategory("ALL"); setSearchQuery(""); setCurrentPage(1); };
  const handleCategoryChange = (cat: ItemCategory) => { setActiveCategory(cat); setCurrentPage(1); };
  const handleSearch = (val: string) => { setSearchQuery(val); setCurrentPage(1); };

  const displayItems = apiData.items.filter(item => {
    if (activeTab === "WATCHLIST") return watchlist.has(item.id);
    if (activeTab === "MY_CLAIMS") return claims.has(item.id);
    return true;
  });

  const toggleWatchlist = (id: string) => { setWatchlist(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const openClaimModal = (item: LostItem) => { if (pendingClaimsCount >= MAX_PENDING_CLAIMS) return; setItemToClaim(item); setProofText(""); setShowClaimModal(true); };
  const submitClaim = () => { if (!itemToClaim || !proofText.trim()) return; setClaims(prev => { const next = new Map(prev); next.set(itemToClaim.id, { status: "PENDING", proof: proofText.trim() }); return next; }); setShowClaimModal(false); };
  const cancelClaim = (id: string) => { setClaims(prev => { const next = new Map(prev); next.delete(id); return next; }); };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case "PENDING": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "VALIDATED": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "REJECTED": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "";
    }
  };

  return { activeTab, handleTabChange, activeCategory, handleCategoryChange, searchQuery, handleSearch, currentPage, setCurrentPage, apiData, isLoading, watchlist, toggleWatchlist, claims, pendingClaimsCount, openClaimModal, cancelClaim, showClaimModal, setShowClaimModal, itemToClaim, proofText, setProofText, submitClaim, displayItems, formatDate, getStatusBadge, MAX_PENDING_CLAIMS };
}