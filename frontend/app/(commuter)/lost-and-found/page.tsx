"use client";

import { type ChangeEvent, useState } from "react";
import { useLostAndFound } from "./use-lost-and-found";
import { categories } from "./data";
import LostItemCard from "@/components/commuter/lost-and-found/lost-item-card";
import { ClaimData, ClaimFilter, ClaimStatus, LostItem, ViewTab } from "./types";
import { BookmarkCheck, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Clock3, ImagePlus, PackageSearch, Search, X, XCircle } from "lucide-react";

interface ProofImage {
  id: string;
  file: File;
  previewUrl: string;
}

export default function LostAndFoundPage() {
  const {
    activeTab, handleTabChange, activeCategory, handleCategoryChange, claimFilter, handleClaimFilterChange, searchQuery, handleSearch,
    setCurrentPage, apiData, isLoading, listError,
    watchlist, toggleWatchlist, claims, claimPageData, openClaimModal, cancelClaim,
    showClaimModal, setShowClaimModal, itemToClaim, proofText, setProofText,
    submitClaim, claimError, isSubmittingClaim,
    displayItems, displayClaims, formatDate, getStatusBadge
  } = useLostAndFound();
  const paginationData = activeTab === "MY_CLAIMS" ? claimPageData : apiData;
  const visibleTotal = activeTab === "MY_CLAIMS" ? claimPageData.totalItems : apiData.totalItems;
  const pageNumbers = buildVisiblePages(paginationData.currentPage, paginationData.totalPages);
  const tabs: { key: ViewTab; label: string; icon: typeof PackageSearch }[] = [
    { key: "ALL", label: "All Items", icon: PackageSearch },
    { key: "WATCHLIST", label: "Watchlist", icon: BookmarkCheck },
    { key: "MY_CLAIMS", label: "Claims", icon: ClipboardList },
  ];

  // Full-detail view — the card only shows a clamped description and a
  // thumbnail; this surfaces the complete description and a larger photo.
  const [detailItem, setDetailItem] = useState<LostItem | null>(null);
  const [proofImages, setProofImages] = useState<ProofImage[]>([]);
  const claimFilters: { label: string; value: ClaimFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Validated", value: "VALIDATED" },
    { label: "Rejected", value: "REJECTED" },
  ];
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "Not yet";
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };
  const clearProofImages = () => {
    setProofImages(current => {
      current.forEach(image => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  };
  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
    clearProofImages();
  };
  const handleProofImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []).filter(file => file.type.startsWith("image/"));
    setProofImages(current => {
      const slots = Math.max(0, 2 - current.length);
      const additions = selected.slice(0, slots).map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...current, ...additions];
    });
    event.target.value = "";
  };
  const removeProofImage = (id: string) => {
    setProofImages(current => {
      const removed = current.find(image => image.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter(image => image.id !== id);
    });
  };
  const handleSubmitClaim = async () => {
    const submitted = await submitClaim();
    if (submitted) clearProofImages();
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#050F1A] relative">
      
      {/* --- HEADER --- */}
      <div className="z-10 flex-shrink-0 border-b border-white/10 bg-[#071A2E] p-4 lg:px-8 lg:py-6">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#62A0EA]/20 bg-[#1A5FB4]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8CB9F0]">
              <PackageSearch className="h-3.5 w-3.5" />
              Passenger desk
            </div>
            <h1 className="text-xl font-bold leading-tight text-white lg:text-2xl">Lost & Found</h1>
            <p className="mt-1 text-xs text-white/45">
              {visibleTotal} records
              {paginationData.totalPages > 0 && ` | Page ${paginationData.currentPage} of ${paginationData.totalPages}`}
            </p>
          </div>
          <div className="grid w-full grid-cols-3 rounded-xl border border-white/10 bg-[#050F1A] p-1 xl:w-auto">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                  activeTab === key
                    ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30"
                    : "text-white/45 hover:bg-white/5 hover:text-white/75"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder={activeTab === "MY_CLAIMS" ? "Search your claims..." : "Search items, plates, driver, conductor..."}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#050F1A] py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#62A0EA]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:max-w-[52%]">
            {categories.map(cat => (
              <button key={cat.value} onClick={() => handleCategoryChange(cat.value)} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeCategory === cat.value ? "bg-[#1A5FB4] border-[#1A5FB4] text-white" : "bg-transparent border-white/10 text-white/50 hover:bg-white/5"}`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        {activeTab === "MY_CLAIMS" && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {claimFilters.map(filter => (
              <button
                key={filter.value}
                onClick={() => handleClaimFilterChange(filter.value)}
                className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                  claimFilter === filter.value
                    ? "border-[#1A5FB4] bg-[#1A5FB4] text-white"
                    : "border-white/10 bg-transparent text-white/50 hover:bg-white/5"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- GRID --- */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 lg:p-8 lg:pb-8">
        {isLoading ? (
          <div className={activeTab === "MY_CLAIMS" ? "space-y-3" : "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"}>
            {Array.from({ length: activeTab === "MY_CLAIMS" ? 4 : 8 }).map((_, index) => (
              <div key={index} className={activeTab === "MY_CLAIMS" ? "h-44 rounded-2xl border border-white/10 bg-white/[0.04]" : "h-96 rounded-xl border border-white/10 bg-white/[0.04]"}>
                <div className="h-full w-full animate-pulse rounded-[inherit] bg-gradient-to-r from-white/[0.03] via-white/[0.07] to-white/[0.03]" />
              </div>
            ))}
          </div>
        ) : listError ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-red-400 font-medium text-sm mb-3">{listError}</p>
            <button onClick={() => handleTabChange(activeTab)} className="px-4 py-2 rounded-full text-xs font-semibold bg-[#1A5FB4] text-white">Try again</button>
          </div>
        ) : activeTab === "MY_CLAIMS" && displayClaims.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
             <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
               <PackageSearch className="h-7 w-7 text-white/20" />
             </div>
             <h3 className="text-white/70 font-semibold mb-1">No claims found</h3>
             <p className="max-w-xs text-white/40 text-sm">Try another status filter or search term.</p>
          </div>
        ) : activeTab !== "MY_CLAIMS" && displayItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
             <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
               <PackageSearch className="h-7 w-7 text-white/20" />
             </div>
             <h3 className="text-white/70 font-semibold mb-1">No matching items</h3>
             <p className="max-w-xs text-white/40 text-sm">Try another keyword or category. New found items appear here as soon as staff reports them.</p>
          </div>
        ) : (
          <>
            {activeTab === "MY_CLAIMS" ? (
              <div className="space-y-3">
                {displayClaims.map(claim => (
                  <ClaimRecordCard
                    key={claim.claimId}
                    claim={claim}
                    formatDateTime={formatDateTime}
                    getStatusBadge={getStatusBadge}
                    onCancelClaim={cancelClaim}
                    onClaimAgain={openClaimModal}
                    onOpenDetails={setDetailItem}
                  />
                ))}
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {displayItems.map(item => (
                <LostItemCard 
                  key={item.id} 
                  item={item} 
                  isWatched={watchlist.has(item.id)}
                  claimStatus={claims.get(item.id)?.status || "NONE"}
                  onToggleWatchlist={toggleWatchlist}
                  onOpenClaimModal={openClaimModal}
                  onCancelClaim={cancelClaim}
                  onOpenDetails={setDetailItem}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
            )}

            {paginationData.totalPages > 1 && (
              <div className="mt-8 mb-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={paginationData.currentPage === 1}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                    paginationData.currentPage === 1
                      ? "cursor-not-allowed border-white/5 bg-white/5 text-white/20"
                      : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                {pageNumbers.map((page, index) => (
                  page === "ellipsis" ? (
                    <span key={`ellipsis-${index}`} className="flex h-10 w-9 items-center justify-center text-sm font-semibold text-white/25">...</span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`h-10 w-10 rounded-lg text-sm font-semibold transition-colors ${
                        paginationData.currentPage === page
                          ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30"
                          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationData.totalPages))}
                  disabled={paginationData.currentPage === paginationData.totalPages}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                    paginationData.currentPage === paginationData.totalPages
                      ? "cursor-not-allowed border-white/5 bg-white/5 text-white/20"
                      : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- ITEM DETAIL MODAL --- */}
      {detailItem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDetailItem(null)}>
          <div className="bg-[#071A2E] w-full max-w-lg max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-56 flex-shrink-0 bg-[#0A1E33]">
              {detailItem.imageUrl ? (
                <img src={detailItem.imageUrl} alt={detailItem.itemName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/20">
                  <PackageSearch className="w-10 h-10" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">No photo yet</span>
                </div>
              )}
              <button onClick={() => setDetailItem(null)} className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-black/50 border border-white/20 text-white hover:bg-black/70 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">{detailItem.category}</div>
            </div>
            <div className="p-6 overflow-y-auto">
              <h2 className="text-white font-bold text-lg mb-2">{detailItem.itemName}</h2>
              <p className="text-white/60 text-sm whitespace-pre-wrap mb-5">{detailItem.description}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5 bg-white/5 rounded-xl p-4 border border-white/5">
                <div><p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Plate No.</p><p className="text-xs text-white/80 font-medium">{detailItem.plateNumber}</p></div>
                <div><p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Est. Time</p><p className="text-xs text-white/80 font-medium">{detailItem.estimatedTimeLost}</p></div>
                <div><p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Driver</p><p className="text-xs text-white/80 font-medium">{detailItem.driverName}</p></div>
                <div><p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Conductor</p><p className="text-xs text-white/80 font-medium">{detailItem.conductorName}</p></div>
              </div>
              <p className="text-center text-[10px] text-white/20 mb-5">Posted on {formatDate(detailItem.datePosted)}</p>
              <div className="flex items-center gap-3">
                {(() => {
                  const status = claims.get(detailItem.id)?.status || "NONE";
                  if (status === "PENDING") {
                    return <button onClick={() => cancelClaim(detailItem.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-medium py-2.5 rounded-xl border border-white/10 transition-colors">Cancel Claim</button>;
                  }
                  if (status === "VALIDATED") {
                    return <div className="flex-1 bg-white/5 text-sm font-semibold py-2.5 rounded-xl text-center text-emerald-400">Validated - Proceed</div>;
                  }
                  return (
                    <button
                      onClick={() => { setDetailItem(null); openClaimModal(detailItem); }}
                      className="flex-1 text-sm font-bold py-2.5 rounded-xl shadow-lg transition-colors bg-[#FF6D3A] hover:bg-[#e55a2b] text-white shadow-[#FF6D3A]/30"
                    >
                      {status === "REJECTED" ? "Claim Again" : "Claim Item"}
                    </button>
                  );
                })()}
                <button onClick={() => toggleWatchlist(detailItem.id)} className={`w-11 h-11 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors ${watchlist.has(detailItem.id) ? "bg-[#1A5FB4]/20 border-[#62A0EA]/30 text-[#62A0EA]" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}>
                  <svg className="w-5 h-5" fill={watchlist.has(detailItem.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CLAIM MODAL --- */}
      {showClaimModal && itemToClaim && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#071A2E] w-full max-w-lg h-[min(700px,85vh)] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/10 flex-shrink-0">
              <h2 className="text-white font-bold text-lg">Claim this Item?</h2>
              <p className="text-white/40 text-xs mt-1">You are claiming: <span className="text-[#62A0EA] font-semibold">{itemToClaim.itemName}</span></p>
            </div>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-2">Proof of Ownership <span className="text-red-400">*</span></label>
                <textarea rows={6} value={proofText} onChange={(e) => setProofText(e.target.value)} placeholder="Describe a specific detail..." className="w-full bg-[#050F1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA] transition-colors resize-none" />
                <p className="text-[10px] text-white/30 mt-2">This will be reviewed by the admin.</p>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-white/70">Proof Images <span className="text-white/35">(optional)</span></label>
                  <span className="text-[10px] font-semibold text-white/35">{proofImages.length}/2</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {proofImages.map(image => (
                    <div key={image.id} className="relative overflow-hidden rounded-xl border border-white/10 bg-[#050F1A]">
                      <img src={image.previewUrl} alt={image.file.name} className="h-28 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeProofImage(image.id)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white hover:bg-black/80"
                        aria-label={`Remove ${image.file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <p className="truncate px-2 py-1.5 text-[10px] text-white/50">{image.file.name}</p>
                    </div>
                  ))}
                  {proofImages.length < 2 && (
                    <label className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 text-center text-white/45 transition-colors hover:border-[#62A0EA]/60 hover:text-white">
                      <ImagePlus className="mb-2 h-6 w-6" />
                      <span className="text-xs font-semibold">Add image</span>
                      <span className="mt-1 text-[10px] text-white/30">JPG, PNG, or WEBP</span>
                      <input type="file" accept="image/*" multiple onChange={handleProofImageChange} className="sr-only" />
                    </label>
                  )}
                </div>
              </div>
              {claimError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                  <p className="text-red-400 text-xs font-medium">{claimError}</p>
                </div>
              )}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                <div>
                  <p className="text-amber-200 text-xs font-bold">Reminder</p>
                  <p className="text-amber-200/60 text-[10px]">You must present a valid ID matching this proof when claiming at the office.</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex gap-3 flex-shrink-0">
              <button onClick={handleCloseClaimModal} className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold py-3 rounded-xl border border-white/10 transition-colors">Cancel</button>
              <button onClick={handleSubmitClaim} disabled={!proofText.trim() || isSubmittingClaim} className={`flex-1 text-sm font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 ${!proofText.trim() || isSubmittingClaim ? "bg-white/10 text-white/30 cursor-not-allowed" : "bg-[#FF6D3A] hover:bg-[#e55a2b] text-white shadow-[#FF6D3A]/30"}`}>
                {isSubmittingClaim ? (
                  <span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</span>
                ) : "Submit Claim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildVisiblePages(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sortedPages = Array.from(pages)
    .filter(page => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return sortedPages.reduce<(number | "ellipsis")[]>((result, page) => {
    const previous = result[result.length - 1];
    if (typeof previous === "number" && page - previous > 1) {
      result.push("ellipsis");
    }
    result.push(page);
    return result;
  }, []);
}

function ClaimRecordCard({
  claim,
  formatDateTime,
  getStatusBadge,
  onCancelClaim,
  onClaimAgain,
  onOpenDetails,
}: {
  claim: ClaimData;
  formatDateTime: (dateStr: string | null) => string;
  getStatusBadge: (status: ClaimStatus) => string;
  onCancelClaim: (id: string) => void;
  onClaimAgain: (item: LostItem) => void;
  onOpenDetails: (item: LostItem) => void;
}) {
  const item = claim.item;
  const statusMeta = {
    PENDING: {
      icon: <Clock3 className="h-4 w-4" />,
      title: "Pending review",
      dateLabel: "Submitted",
      dateValue: formatDateTime(claim.claimDate),
    },
    VALIDATED: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: "Validated",
      dateLabel: "Validated",
      dateValue: formatDateTime(claim.reviewedAt),
    },
    REJECTED: {
      icon: <XCircle className="h-4 w-4" />,
      title: "Rejected",
      dateLabel: "Rejected",
      dateValue: formatDateTime(claim.reviewedAt),
    },
  }[claim.status];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#071A2E] p-4 shadow-lg shadow-black/20">
      <div className="flex gap-4">
        <button
          type="button"
          disabled={!item}
          onClick={() => item && onOpenDetails(item)}
          className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#0A1E33] text-left disabled:cursor-default"
        >
          {item?.imageUrl ? (
            <img src={item.imageUrl} alt={item.itemName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/20">
              <PackageSearch className="h-7 w-7" />
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{item?.itemName ?? "Deleted item"}</p>
              <p className="mt-0.5 text-xs text-white/40">{item ? `${item.category} | ${item.plateNumber}` : "This item record is no longer available"}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(claim.status)}`}>
              {statusMeta.icon}
              {statusMeta.title}
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                <CalendarDays className="h-3.5 w-3.5" />
                {statusMeta.dateLabel}
              </div>
              <p className="text-xs font-medium text-white/75">{statusMeta.dateValue}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/5 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">Claim proof</p>
              <p className="line-clamp-2 text-xs text-white/65">{claim.proof || "No proof text"}</p>
            </div>
          </div>

          {claim.status === "REJECTED" && claim.rejectionReason && (
            <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-200/70">Reason</p>
              <p className="mt-1 text-xs text-red-100/75">{claim.rejectionReason}</p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {item && (
              <button onClick={() => onOpenDetails(item)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white">
                View Details
              </button>
            )}
            {claim.status === "PENDING" && item && (
              <button onClick={() => onCancelClaim(item.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white">
                Cancel Claim
              </button>
            )}
            {claim.status === "REJECTED" && item && (
              <button onClick={() => onClaimAgain(item)} className="rounded-lg bg-[#FF6D3A] px-3 py-2 text-xs font-bold text-white hover:bg-[#e55a2b]">
                Claim Again
              </button>
            )}
            {claim.status === "VALIDATED" && (
              <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                Ready for staff handover
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
