"use client";

import { useState, useMemo } from "react";

// --- TYPES (Backend Proofing) ---
type ItemCategory = "ALL" | "ACCESSORY" | "BAG" | "WALLET" | "GADGET" | "CLOTHING" | "DOCUMENT" | "OTHER";
type ClaimStatus = "NONE" | "PENDING" | "VALIDATED" | "REJECTED";

interface LostItem {
  id: string;
  itemName: string;
  description: string;
  imageUrl: string;
  plateNumber: string;
  driverName: string;
  conductorName: string;
  estimatedTimeLost: string; 
  category: Exclude<ItemCategory, "ALL">;
  datePosted: string;
}

// --- MOCK DATA ---
const mockLostItems: LostItem[] = [
  {
    id: "lf_001", itemName: "Black Leather Wallet", description: "Found under the seat near the back door. Contains some cards but no cash.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Wallet",
    plateNumber: "ABC 1234", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Around 8:00 AM", category: "WALLET", datePosted: "2026-04-05T10:00:00Z"
  },
  {
    id: "lf_002", itemName: "Red Jansport Backpack", description: "Left on the luggage rack. Contains notebooks and a tumbler.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Backpack",
    plateNumber: "XYZ 5678", driverName: "Mario Speedwagon", conductorName: "Luigi Mansion", estimatedTimeLost: "Around 5:30 PM", category: "BAG", datePosted: "2026-04-06T08:00:00Z"
  },
  {
    id: "lf_003", itemName: "iPhone 15 Pro Max", description: "Found on the floor near the entrance. Cracked screen protector.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=iPhone",
    plateNumber: "DEF 9012", driverName: "Crisostomo Ibarra", conductorName: "Sisa Doe", estimatedTimeLost: "Around 7:15 AM", category: "GADGET", datePosted: "2026-04-06T09:00:00Z"
  },
  {
    id: "lf_004", itemName: "Blue Umbrella", description: "Generic blue folding umbrella left on the seat.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Umbrella",
    plateNumber: "ABC 1234", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Around 2:00 PM", category: "ACCESSORY", datePosted: "2026-04-04T14:00:00Z"
  },
  {
    id: "lf_005", itemName: "Official Transcript of Records", description: "Sealed envelope from PUP. Name on the envelope is blurred.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Document",
    plateNumber: "GHI 3456", driverName: "Jose Rizal", conductorName: "Andres Bonifacio", estimatedTimeLost: "Around 9:00 AM", category: "DOCUMENT", datePosted: "2026-04-06T10:00:00Z"
  }
];

const categories: { label: string; value: ItemCategory }[] = [
  { label: "All Items", value: "ALL" },
  { label: "Accessories", value: "ACCESSORY" },
  { label: "Bags", value: "BAG" },
  { label: "Wallets", value: "WALLET" },
  { label: "Gadgets", value: "GADGET" },
  { label: "Clothing", value: "CLOTHING" },
  { label: "Documents", value: "DOCUMENT" },
  { label: "Other", value: "OTHER" },
];

type ViewTab = "ALL" | "WATCHLIST" | "MY_CLAIMS";

export default function LostAndFoundPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>("ALL");
  const [activeCategory, setActiveCategory] = useState<ItemCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Backend-proof state maps
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set(["lf_004"])); 
  const [claims, setClaims] = useState<Map<string, ClaimStatus>>(new Map([["lf_005", "PENDING"]])); 

  const toggleWatchlist = (id: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleClaim = (id: string) => {
    setClaims(prev => {
      const next = new Map(prev);
      if (!next.has(id)) next.set(id, "PENDING");
      return next;
    });
  };

  const cancelClaim = (id: string) => {
    setClaims(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    let items = [...mockLostItems];

    if (activeTab === "WATCHLIST") {
      items = items.filter(item => watchlist.has(item.id));
    } else if (activeTab === "MY_CLAIMS") {
      items = items.filter(item => claims.has(item.id));
    }

    if (activeCategory !== "ALL") {
      items = items.filter(item => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.itemName.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q) ||
        item.plateNumber.toLowerCase().includes(q)
      );
    }

    return items;
  }, [activeTab, activeCategory, searchQuery, watchlist, claims]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case "PENDING": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "VALIDATED": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "REJECTED": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "";
    }
  };

  return (
    /* Root container fills the right side space provided by the layout */
    <div className="h-full w-full flex flex-col overflow-hidden bg-[#050F1A]">
      
      {/* --- TOP HEADER SECTION (Sticky) --- */}
      <div className="flex-shrink-0 border-b border-white/10 bg-[#071A2E] p-4 lg:px-8 lg:py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-white font-bold text-xl lg:text-2xl">Lost & Found</h1>
            <p className="text-white/40 text-xs mt-1">Browse reported items or track your claims.</p>
          </div>

          {/* Tabs / Segment Control */}
          <div className="flex bg-[#050F1A] rounded-xl p-1 border border-white/5 w-fit">
            {[
              { key: "ALL" as ViewTab, label: "All Items" },
              { key: "WATCHLIST" as ViewTab, label: "Watchlist" },
              { key: "MY_CLAIMS" as ViewTab, label: "My Claims" }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setActiveCategory("ALL"); setSearchQuery(""); }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.key ? "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/30" : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Categories */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input 
              type="text"
              placeholder="Search items, plates, descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050F1A] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA] transition-colors"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activeCategory === cat.value ? "bg-[#1A5FB4] border-[#1A5FB4] text-white" : "bg-transparent border-white/10 text-white/50 hover:bg-white/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- SCROLLABLE GRID LIST --- */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 lg:p-8 lg:pb-8">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
            </div>
            <h3 className="text-white/70 font-semibold mb-1">No items found</h3>
            <p className="text-white/40 text-sm max-w-xs">
              {activeTab === "WATCHLIST" ? "You haven't saved any items to your watchlist yet." : activeTab === "MY_CLAIMS" ? "You haven't claimed any items yet." : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filteredItems.map(item => {
              const isWatched = watchlist.has(item.id);
              const claimStatus = claims.get(item.id) || "NONE";

              return (
                <div key={item.id} className="bg-[#071A2E] rounded-2xl border border-white/10 overflow-hidden flex flex-col group hover:border-white/20 transition-all shadow-lg shadow-black/20">
                  
                  {/* Image Container */}
                  <div className="relative h-48 bg-[#0A1E33] overflow-hidden">
                    <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    
                    {/* Watchlist Button Overlay */}
                    <button 
                      onClick={() => toggleWatchlist(item.id)}
                      className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-sm border ${isWatched ? "bg-[#1A5FB4] border-[#62A0EA] shadow-lg shadow-[#1A5FB4]/40" : "bg-black/40 border-white/20 hover:bg-black/60"}`}
                    >
                      <svg className={`w-5 h-5 transition-colors ${isWatched ? "text-white fill-white" : "text-white/80"}`} fill={isWatched ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                    </button>

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      {item.category}
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-bold text-base leading-tight">{item.itemName}</h3>
                      {claimStatus !== "NONE" && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ml-2 flex-shrink-0 ${getStatusBadge(claimStatus)}`}>
                          {claimStatus}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-white/40 text-xs mb-4 line-clamp-2 flex-grow">{item.description}</p>

                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5 bg-white/5 rounded-xl p-3 border border-white/5">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Plate No.</p>
                        <p className="text-xs text-white/80 font-medium">{item.plateNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Est. Time Lost</p>
                        <p className="text-xs text-white/80 font-medium">{item.estimatedTimeLost}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Driver</p>
                        <p className="text-xs text-white/80 font-medium">{item.driverName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Conductor</p>
                        <p className="text-xs text-white/80 font-medium">{item.conductorName}</p>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="flex items-center gap-3 mt-auto">
                      {claimStatus === "NONE" ? (
                        <button 
                          onClick={() => handleClaim(item.id)}
                          className="flex-1 bg-[#FF6D3A] hover:bg-[#e55a2b] text-white text-sm font-bold py-2.5 rounded-xl shadow-lg shadow-[#FF6D3A]/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Claim Item
                        </button>
                      ) : claimStatus === "PENDING" ? (
                        <button 
                          onClick={() => cancelClaim(item.id)}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-medium py-2.5 rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2"
                        >
                          Cancel Claim
                        </button>
                      ) : (
                        <div className="flex-1 bg-white/5 text-sm font-semibold py-2.5 rounded-xl text-center text-emerald-400">
                          Validated - Proceed to Office
                        </div>
                      )}

                      <button 
                        onClick={() => toggleWatchlist(item.id)}
                        className={`w-11 h-11 flex-shrink-0 rounded-xl border flex items-center justify-center transition-colors ${isWatched ? "bg-[#1A5FB4]/20 border-[#62A0EA]/30 text-[#62A0EA]" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"}`}
                      >
                        <svg className="w-5 h-5" fill={isWatched ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                      </button>
                    </div>

                    <p className="text-center text-[10px] text-white/20 mt-3">Posted on {formatDate(item.datePosted)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}