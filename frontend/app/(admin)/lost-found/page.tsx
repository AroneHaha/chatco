// app/(admin)/lost-found/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { LostFoundGrid } from '@/components/admin/lost-found/lost-found-grid';
import { AddLostFoundModal } from '@/components/admin/lost-found/add-lost-found-modal';
import { ClaimsListModal } from '@/components/admin/lost-found/claims-list-modal';
import { HistoryModal } from '@/components/admin/lost-found/history-modal';
import { Plus } from 'lucide-react';

// EXACT Commuter Categories
const categories = [
  { value: "ALL", label: "All Items" },
  { value: "ACCESSORY", label: "Accessories" },
  { value: "BAG", label: "Bags" },
  { value: "WALLET", label: "Wallets" },
  { value: "GADGET", label: "Gadgets" },
  { value: "CLOTHING", label: "Clothing" },
  { value: "DOCUMENT", label: "Documents" },
  { value: "OTHER", label: "Other" },
];

// EXACT Commuter Mock Database + Admin specific fields
const initialItems = [
  { id: "lf_001", itemName: "Black Leather Wallet", description: "Found under the seat near the back door.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Wallet", plateNumber: "ABC 1234", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Around 8:00 AM", category: "WALLET", datePosted: "2026-04-06T10:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_002", itemName: "Red Jansport Backpack", description: "Left on the luggage rack.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Backpack", plateNumber: "XYZ 5678", driverName: "Mario Speedwagon", conductorName: "Luigi Mansion", estimatedTimeLost: "Around 5:30 PM", category: "BAG", datePosted: "2026-04-06T08:00:00Z", reporterName: "Admin", status: "Claimed", claimedBy: "Jane Smith" },
  { id: "lf_003", itemName: "iPhone 15 Pro Max", description: "Found on the floor near the entrance.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=iPhone", plateNumber: "DEF 9012", driverName: "Crisostomo Ibarra", conductorName: "Sisa Doe", estimatedTimeLost: "Around 7:15 AM", category: "GADGET", datePosted: "2026-04-06T09:00:00Z", reporterName: "Conductor Sisa", status: "Unmatched", claimedBy: null },
  { id: "lf_004", itemName: "Blue Umbrella", description: "Generic blue folding umbrella left on the seat.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Umbrella", plateNumber: "ABC 1234", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Around 2:00 PM", category: "ACCESSORY", datePosted: "2026-04-05T14:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_005", itemName: "Official TOR", description: "Sealed envelope from PUP.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Document", plateNumber: "GHI 3456", driverName: "Jose Rizal", conductorName: "Andres Bonifacio", estimatedTimeLost: "Around 9:00 AM", category: "DOCUMENT", datePosted: "2026-04-05T10:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_006", itemName: "Samsung Galaxy Buds", description: "White case, found under passenger seat.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Earbuds", plateNumber: "JKL 7890", driverName: "Apolinario Mabini", conductorName: "Antonio Luna", estimatedTimeLost: "Morning", category: "GADGET", datePosted: "2026-04-05T08:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_007", itemName: "Gray Hoodie", description: "Left on the handrail near the door.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Hoodie", plateNumber: "MNO 1122", driverName: "Emilio Aguinaldo", conductorName: "Manuel Quezon", estimatedTimeLost: "Evening", category: "CLOTHING", datePosted: "2026-04-04T18:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_008", itemName: "Laptop Charger", description: "Lenovo charger found near the driver area.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Charger", plateNumber: "PQR 3344", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Afternoon", category: "ACCESSORY", datePosted: "2026-04-04T15:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_009", itemName: "Prescription Glasses", description: "Black frame, found on the floor.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Glasses", plateNumber: "STU 5566", driverName: "Mario Speedwagon", conductorName: "Luigi Mansion", estimatedTimeLost: "Around 10:00 AM", category: "ACCESSORY", datePosted: "2026-04-04T09:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_010", itemName: "ADT I.D.", description: "Unidentified ID found inside the jeep.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=ID", plateNumber: "VWX 7788", driverName: "Crisostomo Ibarra", conductorName: "Sisa Doe", estimatedTimeLost: "Morning", category: "DOCUMENT", datePosted: "2026-04-03T11:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_011", itemName: "Reusable Water Bottle", description: "Steel bottle with stickers.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Bottle", plateNumber: "YZA 9900", driverName: "Jose Rizal", conductorName: "Andres Bonifacio", estimatedTimeLost: "Afternoon", category: "OTHER", datePosted: "2026-04-03T14:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_012", itemName: "Canvas Tote Bag", description: "White tote bag with minimal dirt.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Tote", plateNumber: "BCD 1122", driverName: "Apolinario Mabini", conductorName: "Antonio Luna", estimatedTimeLost: "Around 6:00 PM", category: "BAG", datePosted: "2026-04-03T17:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_013", itemName: "Power Bank", description: "Black 10,000 mAh power bank.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=PowerBank", plateNumber: "EFG 3344", driverName: "Emilio Aguinaldo", conductorName: "Manuel Quezon", estimatedTimeLost: "Morning", category: "GADGET", datePosted: "2026-04-02T08:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_014", itemName: "Neck Pillow", description: "Gray memory foam neck pillow.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Pillow", plateNumber: "HIJ 5566", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Around 4:00 PM", category: "OTHER", datePosted: "2026-04-02T16:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_015", itemName: "Brown Purse", description: "Small leather purse with coin compartment.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Purse", plateNumber: "KLM 7788", driverName: "Mario Speedwagon", conductorName: "Luigi Mansion", estimatedTimeLost: "Afternoon", category: "WALLET", datePosted: "2026-04-02T13:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_016", itemName: "Smart Watch", description: "Found near the entrance, screen locked.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Watch", plateNumber: "NOP 9900", driverName: "Crisostomo Ibarra", conductorName: "Sisa Doe", estimatedTimeLost: "Around 1:00 PM", category: "GADGET", datePosted: "2026-04-01T12:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_017", itemName: "Ball Cap", description: "Black cap with no logo.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Cap", plateNumber: "QRS 1122", driverName: "Jose Rizal", conductorName: "Andres Bonifacio", estimatedTimeLost: "Morning", category: "CLOTHING", datePosted: "2026-04-01T09:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_018", itemName: "Kids Lunchbox", description: "Blue lunchbox with superhero print.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Lunchbox", plateNumber: "TUV 3344", driverName: "Apolinario Mabini", conductorName: "Antonio Luna", estimatedTimeLost: "Around 11:00 AM", category: "OTHER", datePosted: "2026-03-31T11:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_019", itemName: "Textbook", description: "Engineering textbook, no name written.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=Book", plateNumber: "WXY 5566", driverName: "Emilio Aguinaldo", conductorName: "Manuel Quezon", estimatedTimeLost: "Afternoon", category: "DOCUMENT", datePosted: "2026-03-31T15:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
  { id: "lf_020", itemName: "Yellow Sling Bag", description: "Small yellow bag left on the floor.", imageUrl: "https://placehold.co/400x300/0A1E33/62A0EA?text=SlingBag", plateNumber: "ZAB 7788", driverName: "Juan Dela Cruz", conductorName: "Pedro Penduko", estimatedTimeLost: "Evening", category: "BAG", datePosted: "2026-03-30T18:00:00Z", reporterName: "Admin", status: "Unmatched", claimedBy: null },
];

// SAMPLE APPROVE/REJECT DATA
const initialClaims = [
  { id: 1, itemId: "lf_001", claimantName: "John Doe", claimantContact: "0917-123-4567", claimDate: "2026-04-07 09:00 AM", status: "Pending" },
  { id: 2, itemId: "lf_002", claimantName: "Jane Smith", claimantContact: "0918-234-5678", claimDate: "2026-04-06 10:30 AM", status: "Approved" },
  { id: 3, itemId: "lf_003", claimantName: "Fake Claimant", claimantContact: "0920-456-7890", claimDate: "2026-04-06 11:00 AM", status: "Rejected" },
];

const initialHistory = [
  { id: "H-001", itemId: "lf_001", action: "Reported", details: 'Item "Black Leather Wallet" reported by Admin.', timestamp: "2026-04-06 10:00 AM" },
  { id: "H-002", itemId: "lf_001", action: "Claim Submitted", details: "John Doe submitted a claim with proof of ownership.", timestamp: "2026-04-07 09:00 AM" },
  { id: "H-003", itemId: "lf_002", action: "Claim Approved", details: 'Claim for "Red Jansport Backpack" approved for Jane Smith.', timestamp: "2026-04-06 10:35 AM" },
  { id: "H-004", itemId: "lf_003", action: "Claim Rejected", details: "Claim by Fake Claimant was rejected due to mismatched proof.", timestamp: "2026-04-06 11:15 AM" },
];

export default function LostFoundPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClaimsModalOpen, setIsClaimsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [claims, setClaims] = useState(initialClaims);
  const [history, setHistory] = useState(initialHistory);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING_CLAIMS'>('ALL');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeTab === 'PENDING_CLAIMS') result = result.filter(item => item.status === 'Unmatched');
    if (activeCategory !== 'ALL') result = result.filter(item => item.category === activeCategory);
    if (searchQuery.trim()) result = result.filter(item => item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase()));
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

  const handleSaveItem = (newItem: any) => {
    setItems(prev => [...prev, { ...newItem, id: `lf_${prev.length + 21}`, status: 'Unmatched', claimedBy: null, datePosted: new Date().toISOString() }]);
    handleCloseAddModal();
  };

  const handleClaimAction = (itemId: string, action: 'Release' | 'Return' | 'Reject', claimantName: string) => {
    const newStatus = action === 'Release' ? 'Released' : action === 'Return' ? 'Returned' : 'Rejected';
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, status: newStatus, claimedBy: claimantName } : item));
    setHistory(prev => [...prev, { id: `H-${prev.length + 1}`, itemId, action: `Claim ${newStatus}`, details: `Claim for item ${itemId} was ${newStatus.toLowerCase()} by admin for ${claimantName}.`, timestamp: new Date().toLocaleString() }]);
    setClaims(prev => prev.map(claim => claim.itemId === itemId ? { ...claim, status: newStatus } : claim));
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
            {categories.map(cat => (
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
              <LostFoundGrid items={displayItems} onViewClaims={handleOpenClaimsModal} onViewHistory={handleOpenHistoryModal} />
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

      <AddLostFoundModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} onSave={handleSaveItem} />
      <ClaimsListModal isOpen={isClaimsModalOpen} onClose={handleCloseClaimsModal} itemId={selectedItemId || ''} claims={claims.filter(c => c.itemId === selectedItemId)} onClaimAction={handleClaimAction} />
      <HistoryModal isOpen={isHistoryModalOpen} onClose={handleCloseHistoryModal} itemId={selectedItemId || ''} history={history.filter(h => h.itemId === selectedItemId)} />
    </div>
  );
}