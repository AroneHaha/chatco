"use client";

import { useLostAndFound } from "./use-lost-and-found";
import { categories } from "./data";
import LostItemCard from "@/components/commuter/lost-and-found/lost-item-card";
import { ViewTab } from "./types";

export default function LostAndFoundPage() {
  const {
    activeTab, handleTabChange, activeCategory, handleCategoryChange, searchQuery, handleSearch,
    currentPage, setCurrentPage, apiData, isLoading,
    watchlist, toggleWatchlist, claims, pendingClaimsCount, openClaimModal, cancelClaim,
    showClaimModal, setShowClaimModal, itemToClaim, proofText, setProofText, submitClaim,
    displayItems, formatDate, getStatusBadge, MAX_PENDING_CLAIMS
  } = useLostAndFound();

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#050F1A] relative">
      
      {/* --- HEADER --- */}
      <div className="flex-shrink-0 border-b border-white/10 bg-[#071A2E] p-4 lg:px-8 lg:py-6 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-white font-bold text-xl lg:text-2xl">Lost & Found</h1>
            <p className="text-white/40 text-xs mt-1">{apiData.totalItems} items reported • Page {apiData.currentPage} of {apiData.totalPages}</p>
          </div>
          <div className="flex bg-[#050F1A] rounded-xl p-1 border border-white/5 w-fit">
            {([ ["ALL", "All Items"], ["WATCHLIST", "Watchlist"], ["MY_CLAIMS", `Claims (${pendingClaimsCount}/${MAX_PENDING_CLAIMS})`] ] as [ViewTab, string][]).map(([key, label]) => (
              <button key={key} onClick={() => handleTabChange(key)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === key ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input type="text" placeholder="Search items, plates..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="w-full bg-[#050F1A] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA] transition-colors" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button key={cat.value} onClick={() => handleCategoryChange(cat.value)} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeCategory === cat.value ? "bg-[#1A5FB4] border-[#1A5FB4] text-white" : "bg-transparent border-white/10 text-white/50 hover:bg-white/5"}`}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- GRID --- */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 lg:p-8 lg:pb-8">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-[#62A0EA] rounded-full animate-spin" />
            <p className="text-white/40 text-sm mt-4">Fetching items...</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
             <h3 className="text-white/70 font-semibold mb-1">No items found</h3>
             <p className="text-white/40 text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {displayItems.map(item => (
                <LostItemCard 
                  key={item.id} 
                  item={item} 
                  isWatched={watchlist.has(item.id)}
                  claimStatus={claims.get(item.id)?.status || "NONE"}
                  claimLimitReached={pendingClaimsCount >= MAX_PENDING_CLAIMS && (claims.get(item.id)?.status || "NONE") === "NONE"}
                  onToggleWatchlist={toggleWatchlist}
                  onOpenClaimModal={openClaimModal}
                  onCancelClaim={cancelClaim}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>

            {apiData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 mb-4">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={apiData.currentPage === 1} className={`px-4 py-2 rounded-lg text-sm font-semibold ${apiData.currentPage === 1 ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>Prev</button>
                {Array.from({ length: apiData.totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 rounded-lg text-sm font-semibold ${apiData.currentPage === page ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, apiData.totalPages))} disabled={apiData.currentPage === apiData.totalPages} className={`px-4 py-2 rounded-lg text-sm font-semibold ${apiData.currentPage === apiData.totalPages ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- CLAIM MODAL --- */}
      {showClaimModal && itemToClaim && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#071A2E] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-white font-bold text-lg">Claim this Item?</h2>
              <p className="text-white/40 text-xs mt-1">You are claiming: <span className="text-[#62A0EA] font-semibold">{itemToClaim.itemName}</span></p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white/70 mb-2">Proof of Ownership <span className="text-red-400">*</span></label>
                <textarea rows={3} value={proofText} onChange={(e) => setProofText(e.target.value)} placeholder="Describe a specific detail..." className="w-full bg-[#050F1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA] transition-colors resize-none" />
                <p className="text-[10px] text-white/30 mt-2">This will be reviewed by the admin.</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                <div>
                  <p className="text-amber-200 text-xs font-bold">Reminder</p>
                  <p className="text-amber-200/60 text-[10px]">You must present a valid ID matching this proof when claiming at the office.</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button onClick={() => setShowClaimModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold py-3 rounded-xl border border-white/10 transition-colors">Cancel</button>
              <button onClick={submitClaim} disabled={!proofText.trim()} className={`flex-1 text-sm font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 ${!proofText.trim() ? "bg-white/10 text-white/30 cursor-not-allowed" : "bg-[#FF6D3A] hover:bg-[#e55a2b] text-white shadow-[#FF6D3A]/30"}`}>Submit Claim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}