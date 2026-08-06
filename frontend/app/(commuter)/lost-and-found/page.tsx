"use client";

import { type ReactNode, useState } from "react";
import { useLostAndFound } from "./use-lost-and-found";
import { categories } from "./data";
import LostItemCard from "@/components/commuter/lost-and-found/lost-item-card";
import { ClaimData, ClaimStatus, ItemCategory, LostItem, ViewTab } from "./types";
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  BusFront,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileCheck2,
  IdCard,
  PackageSearch,
  Search,
  ShieldCheck,
  Tag,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

export default function LostAndFoundPage() {
  const {
    activeTab, handleTabChange, activeCategory, handleCategoryChange, searchQuery, handleSearch,
    selectedDate, handleDateChange,
    setCurrentPage, apiData, isLoading, listError,
    watchlist, toggleWatchlist, claims, claimPageData, openClaimModal,
    claimToCancel, requestCancelClaim, closeCancelClaimModal, confirmCancelClaim, isCancellingClaim, cancelToast,
    showClaimModal, setShowClaimModal, itemToClaim, proofText, setProofText,
    submitClaim, claimError, isSubmittingClaim,
    displayItems, displayClaims, formatDate, getStatusBadge
  } = useLostAndFound();
  const paginationData = activeTab === "MY_CLAIMS" ? claimPageData : apiData;
  const pageNumbers = buildVisiblePages(paginationData.currentPage, paginationData.totalPages);
  const tabs: { key: ViewTab; label: string; icon: typeof PackageSearch }[] = [
    { key: "ALL", label: "All Items", icon: PackageSearch },
    { key: "WATCHLIST", label: "Watchlist", icon: BookmarkCheck },
    { key: "MY_CLAIMS", label: "Claims", icon: ClipboardList },
  ];
  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? "All Items";
  const activeCategoryLabel = categories.find((cat) => cat.value === activeCategory)?.label ?? "All";
  const activeFilterCount = Number(Boolean(searchQuery.trim())) + Number(Boolean(selectedDate)) + Number(activeCategory !== "ALL");

  // Full-detail view — the card only shows a clamped description and a
  // thumbnail; this surfaces the complete description and a larger photo.
  const [detailItem, setDetailItem] = useState<LostItem | null>(null);
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
  const handleCloseClaimModal = () => {
    setShowClaimModal(false);
  };
  const handleSubmitClaim = async () => {
    await submitClaim();
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#050F1A] relative">
      
      {/* --- HEADER --- */}
      <div className="z-10 flex-shrink-0 border-b border-white/10 bg-[#071A2E]/98 shadow-lg shadow-black/15">
        <div className="px-4 py-4 lg:px-8 lg:py-5">
          <div className="mb-4 min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#62A0EA]/20 bg-[#1A5FB4]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8CB9F0]">
                <PackageSearch className="h-3.5 w-3.5" />
                Passenger desk
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/45">
                {activeTabLabel}
              </span>
            </div>
            <h1 className="text-xl font-bold leading-tight text-white lg:text-2xl">Lost & Found</h1>
          </div>

          <div className="mb-3 grid grid-cols-3 rounded-xl border border-white/10 bg-[#050F1A] p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={`relative inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold transition-all sm:px-4 ${
                  activeTab === key
                    ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30"
                    : "text-white/45 hover:bg-white/5 hover:text-white/75"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_15rem] lg:items-center">
            <div className="relative min-w-0">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder={activeTab === "MY_CLAIMS" ? "Search claims by item, plate, driver, conductor..." : "Search item, plate, driver, or conductor..."}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#050F1A] pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#62A0EA]"
              />
            </div>
            <div className="relative">
              <CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#050F1A] pl-11 pr-10 text-sm font-semibold text-white/70 outline-none transition-colors [color-scheme:dark] focus:border-[#62A0EA]"
                aria-label="Filter lost and found items by posted date"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => handleDateChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/35 transition-colors hover:bg-white/5 hover:text-white/75"
                  aria-label="Clear date filter"
                  title="Clear date"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={activeCategory}
                onChange={(e) => handleCategoryChange(e.target.value as ItemCategory)}
                className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#050F1A] px-4 pr-10 text-sm font-semibold text-white/70 outline-none transition-colors [color-scheme:dark] focus:border-[#62A0EA]"
                aria-label="Filter lost and found items by category"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            </div>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchQuery.trim() && (
                <button type="button" onClick={() => handleSearch("")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-white/55 hover:bg-white/[0.07] hover:text-white">
                  Search
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {selectedDate && (
                <button type="button" onClick={() => handleDateChange("")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-white/55 hover:bg-white/[0.07] hover:text-white">
                  {formatDate(selectedDate)}
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {activeCategory !== "ALL" && (
                <button type="button" onClick={() => handleCategoryChange("ALL")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-white/55 hover:bg-white/[0.07] hover:text-white">
                  {activeCategoryLabel}
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
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
                    onCancelClaim={requestCancelClaim}
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
                  onCancelClaim={requestCancelClaim}
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDetailItem(null)}>
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#071A2E] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="grid min-h-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="relative aspect-[4/3] bg-[#0A1E33] lg:aspect-auto lg:min-h-[520px]">
                {detailItem.imageUrl ? (
                  <img src={detailItem.imageUrl} alt={detailItem.itemName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/20">
                    <PackageSearch className="h-12 w-12" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">No photo yet</span>
                  </div>
                )}
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                    <Tag className="h-3 w-3" />
                    {detailItem.category}
                  </span>
                  <button onClick={() => setDetailItem(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white transition-colors hover:bg-black/70" aria-label="Close item details">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-4 pt-16">
                  <p className="text-xs font-semibold text-white/55">Posted {formatDate(detailItem.datePosted)}</p>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto p-5 lg:p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-bold leading-tight text-white">{detailItem.itemName}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/58">{detailItem.description}</p>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailInfo icon={<IdCard className="h-4 w-4" />} label="Plate Number" value={detailItem.plateNumber || "Plate unavailable"} />
                  <DetailInfo icon={<Clock3 className="h-4 w-4" />} label="Estimated Time" value={detailItem.estimatedTimeLost || "Time unavailable"} />
                  <DetailInfo icon={<BusFront className="h-4 w-4" />} label="Driver" value={detailItem.driverName || "Driver unavailable"} />
                  <DetailInfo icon={<UserRound className="h-4 w-4" />} label="Conductor" value={detailItem.conductorName || "Conductor unavailable"} />
                </div>

                <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                    <div>
                      <p className="text-xs font-bold text-amber-100">Claim reminder</p>
                      <p className="mt-1 text-xs leading-5 text-amber-100/65">Submit specific proof only if this item is yours. Staff may ask for a valid ID during handover.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {(() => {
                    const status = claims.get(detailItem.id)?.status || "NONE";
                    if (status === "PENDING") {
                      return <button onClick={() => requestCancelClaim(detailItem.id)} className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white/65 transition-colors hover:bg-white/10 hover:text-white">Cancel Claim</button>;
                    }
                    if (status === "VALIDATED" || status === "RELEASED") {
                      return (
                        <div className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-sm font-semibold text-emerald-300">
                          <ShieldCheck className="h-4 w-4" />
                          {status === "RELEASED" ? "Released" : "Validated"}
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={() => { setDetailItem(null); openClaimModal(detailItem); }}
                        className="h-11 flex-1 rounded-xl bg-[#FF6D3A] text-sm font-bold text-white shadow-lg shadow-[#FF6D3A]/25 transition-colors hover:bg-[#e55a2b]"
                      >
                        {status === "REJECTED" ? "Claim Again" : "Claim Item"}
                      </button>
                    );
                  })()}
                  <button onClick={() => toggleWatchlist(detailItem.id)} className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border transition-colors ${watchlist.has(detailItem.id) ? "border-[#62A0EA]/35 bg-[#1A5FB4]/20 text-[#62A0EA]" : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`} aria-label={watchlist.has(detailItem.id) ? "Remove from watchlist" : "Add to watchlist"}>
                    <Bookmark className={`h-5 w-5 ${watchlist.has(detailItem.id) ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CLAIM MODAL --- */}
      {showClaimModal && itemToClaim && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex h-[min(720px,88vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#071A2E] shadow-2xl">
            <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-white/10 p-5">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#FF6D3A]/25 bg-[#FF6D3A]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFB199]">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Claim request
                </div>
                <h2 className="text-lg font-bold text-white">Proof of ownership</h2>
                <p className="mt-1 line-clamp-1 text-xs text-white/45">
                  {itemToClaim.itemName} on {itemToClaim.plateNumber || "assigned vehicle"}
                </p>
              </div>
              <button onClick={handleCloseClaimModal} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close claim modal">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <DetailInfo icon={<Tag className="h-4 w-4" />} label="Category" value={itemToClaim.category} />
                  <DetailInfo icon={<Clock3 className="h-4 w-4" />} label="Estimated Time" value={itemToClaim.estimatedTimeLost || "Time unavailable"} />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white/75">Proof of Ownership <span className="text-red-400">*</span></label>
                <textarea
                  rows={6}
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="Describe a specific detail, where you sat, unique marks, contents, or anything staff can verify."
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#050F1A] px-4 py-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#62A0EA]"
                />
                <p className="mt-2 text-[10px] font-medium text-white/30">This proof is visible to the admin reviewer.</p>
              </div>

              {claimError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                  <p className="text-xs font-medium leading-5 text-red-300">{claimError}</p>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                <div>
                  <p className="text-xs font-bold text-amber-100">Reminder</p>
                  <p className="mt-1 text-xs leading-5 text-amber-100/65">Bring a valid ID during handover. Staff may reject claims that do not match the item details.</p>
                </div>
              </div>
            </div>

            <div className="grid flex-shrink-0 grid-cols-2 gap-3 border-t border-white/10 p-5">
              <button onClick={handleCloseClaimModal} className="h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white">Cancel</button>
              <button onClick={handleSubmitClaim} disabled={!proofText.trim() || isSubmittingClaim} className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-lg transition-colors ${!proofText.trim() || isSubmittingClaim ? "cursor-not-allowed bg-white/10 text-white/30 shadow-none" : "bg-[#FF6D3A] text-white shadow-[#FF6D3A]/30 hover:bg-[#e55a2b]"}`}>
                {isSubmittingClaim ? (
                  <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Submitting...</span>
                ) : "Submit Claim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CANCEL CLAIM CONFIRMATION MODAL --- */}
      {claimToCancel && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#071A2E] shadow-2xl">
            <div className="flex items-start gap-4 p-5">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white">Cancel this claim?</h2>
                <p className="mt-1.5 text-sm leading-5 text-white/55">
                  {claims.get(claimToCancel)?.item?.itemName ? (
                    <>This will cancel your claim on &ldquo;<span className="font-semibold text-white/80">{claims.get(claimToCancel)?.item?.itemName}</span>&rdquo;. </>
                  ) : (
                    "This will cancel your claim. "
                  )}
                  You can submit a new claim later if the item is still available.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 p-5">
              <button
                onClick={closeCancelClaimModal}
                disabled={isCancellingClaim}
                className="h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Keep Claim
              </button>
              <button
                onClick={() => void confirmCancelClaim()}
                disabled={isCancellingClaim}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-lg transition-colors ${isCancellingClaim ? "cursor-not-allowed bg-white/10 text-white/30 shadow-none" : "bg-red-500 text-white shadow-red-500/25 hover:bg-red-600"}`}
              >
                {isCancellingClaim ? (
                  <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Cancelling...</span>
                ) : "Yes, Cancel Claim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CANCEL SUCCESS TOAST --- */}
      {cancelToast && (
        <div className="fixed bottom-6 left-1/2 z-[120] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#071A2E] px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          {cancelToast}
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

function DetailInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-white/8 bg-white/[0.04] p-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-black/20 text-[#62A0EA]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-white/85">{value}</p>
      </div>
    </div>
  );
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
  /** Opens the cancel-claim confirmation modal for this claim's item. */
  onCancelClaim: (id: string) => void;
  onClaimAgain: (item: LostItem) => void;
  onOpenDetails: (item: LostItem) => void;
}) {
  const item = claim.item;
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const statusMeta = {
    PENDING: {
      icon: <Clock3 className="h-4 w-4" />,
      title: "Claim Submitted",
      summary: "Waiting for staff review",
      dateValue: formatDateTime(claim.claimDate),
      panelClass: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    },
    VALIDATED: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: "Ready for Release",
      summary: "Your claim was approved. Bring a valid ID for handover.",
      dateValue: formatDateTime(claim.approvedAt ?? claim.reviewedAt),
      panelClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    },
    REJECTED: {
      icon: <XCircle className="h-4 w-4" />,
      title: "Rejected",
      summary: claim.rejectionReason ?? "Staff rejected this claim.",
      dateValue: formatDateTime(claim.rejectedAt ?? claim.reviewedAt),
      panelClass: "border-red-500/20 bg-red-500/10 text-red-100",
    },
    RELEASED: {
      icon: <ShieldCheck className="h-4 w-4" />,
      title: "Released",
      summary: "The item has been released by staff.",
      dateValue: formatDateTime(claim.releasedAt),
      panelClass: "border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#D7E8FF]",
    },
  }[claim.status];
  const timelineSteps = buildClaimTimeline(claim, item);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#071A2E] p-4 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-4 sm:flex-row">
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

          <div className={`mt-3 rounded-xl border p-3 ${statusMeta.panelClass}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-current/20 bg-black/15">
                  {statusMeta.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{statusMeta.title}</p>
                  <p className="mt-1 text-xs leading-5 opacity-70">{statusMeta.summary}</p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 text-xs font-semibold opacity-80">
                <CalendarDays className="h-3.5 w-3.5" />
                {statusMeta.dateValue}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTimelineOpen((current) => !current)}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-xs font-semibold text-white/65 transition-colors hover:bg-white/[0.07] hover:text-white"
            aria-expanded={isTimelineOpen}
          >
            <span>Claim history</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isTimelineOpen ? "rotate-180" : ""}`} />
          </button>

          {isTimelineOpen && (
            <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <div className="space-y-0">
                {timelineSteps.map((step, index) => (
                  <div key={step.key} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${step.tone}`}>
                        {step.icon}
                      </div>
                      {index < timelineSteps.length - 1 && <div className="h-full min-h-6 w-px bg-white/10" />}
                    </div>
                    <div className={index < timelineSteps.length - 1 ? "pb-4" : ""}>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-bold text-white">{step.label}</p>
                        <p className="text-xs font-semibold text-white/45">{formatDateTime(step.date)}</p>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-white/50">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-white/5 bg-black/15 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">Proof of ownership</p>
                <p className="text-xs leading-5 text-white/65">{claim.proof || "No proof text"}</p>
              </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}

interface ClaimTimelineStep {
  key: string;
  label: string;
  date: string | null;
  detail: string;
  icon: ReactNode;
  tone: string;
}

function buildClaimTimeline(claim: ClaimData, item: LostItem | null): ClaimTimelineStep[] {
  const itemName = item?.itemName ?? "this item";
  const steps: ClaimTimelineStep[] = [
    {
      key: "submitted",
      label: "Claim Submitted",
      date: claim.claimDate,
      detail: `Your proof for ${itemName} was submitted for staff review.`,
      icon: <Clock3 className="h-3.5 w-3.5" />,
      tone: "border-amber-500/35 bg-amber-500/15 text-amber-300",
    },
  ];

  if (claim.status === "VALIDATED" || claim.status === "RELEASED") {
    steps.push({
      key: "approved",
      label: "Approved",
      date: claim.approvedAt ?? claim.reviewedAt,
      detail: "Staff approved the claim. The item is ready for release once identity is verified.",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      tone: "border-emerald-500/35 bg-emerald-500/15 text-emerald-300",
    });
  }

  if (claim.status === "RELEASED") {
    steps.push({
      key: "released",
      label: "Released",
      date: claim.releasedAt,
      detail: "Staff recorded the item handover and completed this claim.",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      tone: "border-[#62A0EA]/35 bg-[#62A0EA]/15 text-[#8CB9F0]",
    });
  }

  if (claim.status === "REJECTED") {
    steps.push({
      key: "rejected",
      label: "Rejected",
      date: claim.rejectedAt ?? claim.reviewedAt,
      detail: claim.rejectionReason ?? "Staff rejected the claim after review.",
      icon: <XCircle className="h-3.5 w-3.5" />,
      tone: "border-red-500/35 bg-red-500/15 text-red-300",
    });
  }

  return steps;
}
