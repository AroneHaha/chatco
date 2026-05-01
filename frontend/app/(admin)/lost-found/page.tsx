// app/(admin)/lost-found/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { LostFoundGrid } from '@/components/admin/lost-found/lost-found-grid';
import { AddLostFoundModal } from '@/components/admin/lost-found/add-lost-found-modal';
import { ViewItemModal } from '@/components/admin/lost-found/view-item-modal';
import { ClaimsListModal } from '@/components/admin/lost-found/claims-list-modal';
import { HistoryModal } from '@/components/admin/lost-found/history-modal';
import { Plus } from 'lucide-react';
import {
  initialLostFoundItems,
  initialClaims,
  initialHistoryLog,
  itemCategoriesWithAll,
  type LostFoundItem,
  type Claim,
  type HistoryEvent,
  type ItemCategory,
  type ItemStatus,
  type ClaimStatus,
} from '@/app/(admin)/lost-found/data/lost-found-data';
import type { LostFoundFormData } from '@/components/admin/lost-found/add-lost-found-modal';

export default function LostFoundPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClaimsModalOpen, setIsClaimsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [items, setItems] = useState<LostFoundItem[]>(initialLostFoundItems);
  const [claims, setClaims] = useState<Claim[]>(initialClaims);
  const [history, setHistory] = useState<HistoryEvent[]>(initialHistoryLog);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING_CLAIMS'>('ALL');
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeTab === 'PENDING_CLAIMS') result = result.filter((item: LostFoundItem) => item.status === 'Unmatched');
    if (activeCategory !== 'ALL') result = result.filter((item: LostFoundItem) => item.category === activeCategory);
    if (searchQuery.trim()) result = result.filter((item: LostFoundItem) => item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [items, activeTab, activeCategory, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const displayItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleOpenAddModal = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);
  const handleOpenClaimsModal = (itemId: string) => { setSelectedItemId(itemId); setIsClaimsModalOpen(true); };
  const handleCloseClaimsModal = () => { setSelectedItemId(null); setIsClaimsModalOpen(false); };
  const handleOpenHistoryModal = (itemId: string) => { setSelectedItemId(itemId); setIsHistoryModalOpen(true); };
  const handleCloseHistoryModal = () => { setSelectedItemId(null); setIsHistoryModalOpen(false); };
  const handleOpenDetailModal = (itemId: string) => { setSelectedItemId(itemId); setIsDetailModalOpen(true); };
  const handleCloseDetailModal = () => { setSelectedItemId(null); setIsDetailModalOpen(false); };

  const handleSaveItem = (newItem: LostFoundFormData) => {
    const nextId = `lf_${String(items.length + 1).padStart(3, '0')}`;
    setItems(prev => [...prev, {
      id: nextId,
      itemName: newItem.itemName,
      description: newItem.description,
      imageUrl: newItem.imagePreview || `https://placehold.co/400x300/0A1E33/62A0EA?text=${encodeURIComponent(newItem.itemName)}`,
      plateNumber: newItem.plateNumber,
      driverName: newItem.driverName,
      conductorName: newItem.conductorName,
      estimatedTimeLost: newItem.estimatedTimeLost,
      category: newItem.category,
      datePosted: new Date().toISOString(),
      reporterName: newItem.reporterName,
      status: 'Unmatched',
      claimedBy: null,
    }]);
    handleCloseAddModal();
  };

  const handleClaimAction = (itemId: string, action: 'Release' | 'Return' | 'Reject', claimantName: string) => {
    const newStatus: ItemStatus = action === 'Release' ? 'Released' : action === 'Return' ? 'Returned' : 'Rejected';
    const newClaimStatus: ClaimStatus = newStatus as ClaimStatus;
    setItems(prev => prev.map((item: LostFoundItem) => item.id === itemId ? { ...item, status: newStatus, claimedBy: claimantName } : item));
    setHistory(prev => [...prev, {
      id: `H-${String(prev.length + 1).padStart(3, '0')}`,
      itemId,
      action: `Claim ${newStatus}`,
      details: `Claim for item ${itemId} was ${newStatus.toLowerCase()} by admin for ${claimantName}.`,
      timestamp: new Date().toLocaleString(),
    }]);
    setClaims(prev => prev.map((claim: Claim) => claim.itemId === itemId ? { ...claim, status: newClaimStatus } : claim));
    handleCloseClaimsModal();
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative">
      <div className="flex-shrink-0 border-b border-white/10 bg-white/5 backdrop-blur-md p-4 lg:px-8 lg:py-6 z-10 rounded-xl mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-white font-bold text-xl lg:text-2xl">Lost & Found Management</h1>
            <p className="text-white/40 text-xs mt-1">{filteredItems.length} items reported • Page {currentPage} of {totalPages || 1}</p>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-fit">
            <div className="flex bg-white/5 rounded-xl p-1 border border-white/10 w-fit">
              {([ ["ALL", "All Items"], ["PENDING_CLAIMS", "Pending Claims"] ] as const).map(([key, label]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === key ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "text-white/40 hover:text-white/70 hover:bg-white/10"}`}>{label}</button>
              ))}
            </div>
            <button onClick={handleOpenAddModal} className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30">
              <Plus size={16} /><span>Add Item</span>
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input type="text" placeholder="Search items, plates..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {itemCategoriesWithAll.map(cat => (
              <button key={cat.value} onClick={() => { setActiveCategory(cat.value); setCurrentPage(1); }} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${activeCategory === cat.value ? "bg-blue-500 border-blue-500 text-white" : "bg-transparent border-white/10 text-white/50 hover:bg-white/10"}`}>{cat.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 lg:pb-8">
        {displayItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <h3 className="text-white/70 font-semibold mb-1">No items found</h3>
            <p className="text-white/40 text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              <LostFoundGrid items={displayItems} onViewClaims={handleOpenClaimsModal} onViewHistory={handleOpenHistoryModal} onViewDetails={handleOpenDetailModal} />
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 mb-4">
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`px-4 py-2 rounded-lg text-sm font-semibold ${currentPage === 1 ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 rounded-lg text-sm font-semibold ${currentPage === page ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className={`px-4 py-2 rounded-lg text-sm font-semibold ${currentPage === totalPages ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      <ViewItemModal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} item={items.find((i: LostFoundItem) => i.id === selectedItemId) ?? null} />
      <AddLostFoundModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} onSave={handleSaveItem} />
      <ClaimsListModal isOpen={isClaimsModalOpen} onClose={handleCloseClaimsModal} itemId={selectedItemId || ''} claims={claims.filter((c: Claim) => c.itemId === selectedItemId)} onClaimAction={handleClaimAction} />
      <HistoryModal isOpen={isHistoryModalOpen} onClose={handleCloseHistoryModal} itemId={selectedItemId || ''} history={history.filter((h: HistoryEvent) => h.itemId === selectedItemId)} />
    </div>
  );
}