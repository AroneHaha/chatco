// app/(admin)/lost-found/page.tsx
'use client';

import { useState } from 'react';
import { LostFoundGrid } from '@/components/admin/lost-found/lost-found-grid';
import { AddLostFoundModal } from '@/components/admin/lost-found/add-lost-found-modal';
import { ClaimsListModal } from '@/components/admin/lost-found/claims-list-modal';
import { HistoryModal } from '@/components/admin/lost-found/history-modal';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Plus } from 'lucide-react';

interface LostFoundItem {
  id: string;
  description: string;
  reporterName: string;
  status: 'Unmatched' | 'Matched' | 'Claimed' | 'Released' | 'Returned' | 'Rejected';
  imageUrl: string;
  reportedAt: string;
  claimedBy: string | null;
}

interface Claim {
  id: number;
  itemId: string;
  claimantName: string;
  claimantContact: string;
  claimDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Released' | 'Returned';
}

interface HistoryEntry {
  id: string;
  itemId: string;
  action: string;
  details: string;
  timestamp: string;
}

const initialItems: LostFoundItem[] = [
  {
    id: 'LF-01',
    description: 'Black compact umbrella with a curved handle.',
    reporterName: 'Admin',
    status: 'Unmatched',
    imageUrl: 'https://images.unsplash.com/photo-1572400547114-3c2a8b7d1b1b?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-15 08:30 AM',
    claimedBy: null,
  },
  {
    id: 'LF-02',
    description: 'Green leather wallet with multiple card slots.',
    reporterName: 'Admin',
    status: 'Unmatched',
    imageUrl: 'https://images.unsplash.com/photo-1564588766842-70c8283a8b0a?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-15 09:15 AM',
    claimedBy: null,
  },
  {
    id: 'LF-03',
    description: 'Phone charger (Type-C) and a pair of wired earphones.',
    reporterName: 'Admin',
    status: 'Unmatched',
    imageUrl: 'https://images.unsplash.com/photo-1596462334453-4c025554b4a1?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-14 04:00 PM',
    claimedBy: null,
  },
  {
    id: 'LF-04',
    description: 'A single house key with a red plastic keychain.',
    reporterName: 'Admin',
    status: 'Unmatched',
    imageUrl: 'https://images.unsplash.com/photo-1588426811338-3c2a8b7d1b1b?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-15 11:45 AM',
    claimedBy: null,
  },
  {
    id: 'LF-05',
    description: 'Blue water bottle, half-full.',
    reporterName: 'Admin',
    status: 'Unmatched',
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb14f0d9d84c?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-15 01:20 PM',
    claimedBy: null,
  },
  {
    id: 'LF-06',
    description: 'A worn-out paperback novel with a blue cover.',
    reporterName: 'Admin',
    status: 'Unmatched',
    imageUrl: 'https://images.unsplash.com/photo-1544947950-8b0f8ba719f8?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-13 10:00 AM',
    claimedBy: null,
  },
];

const initialClaims: Claim[] = [
  {
    id: 1,
    itemId: 'LF-01',
    claimantName: 'John Doe',
    claimantContact: '0917-123-4567',
    claimDate: '2024-04-15 09:00 AM',
    status: 'Pending',
  },
  {
    id: 2,
    itemId: 'LF-02',
    claimantName: 'Jane Smith',
    claimantContact: '0918-234-5678',
    claimDate: '2024-04-15 10:00 AM',
    status: 'Pending',
  },
];

const initialHistory: HistoryEntry[] = [
  {
    id: 'H-001',
    itemId: 'LF-01',
    action: 'Reported',
    details: 'Item "Black compact umbrella" reported by Admin.',
    timestamp: '2024-04-15 08:30 AM',
  },
];

export default function LostFoundPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClaimsModalOpen, setIsClaimsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [items, setItems] = useState<LostFoundItem[]>(initialItems);
  const [claims, setClaims] = useState<Claim[]>(initialClaims);
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenAddModal = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);

  const handleOpenClaimsModal = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsClaimsModalOpen(true);
  };
  const handleCloseClaimsModal = () => {
    setSelectedItemId(null);
    setIsClaimsModalOpen(false);
  };
  
  const handleOpenHistoryModal = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsHistoryModalOpen(true);
  };
  const handleCloseHistoryModal = () => {
    setSelectedItemId(null);
    setIsHistoryModalOpen(false);
  };
  
  const handleSaveItem = (newItem: Omit<LostFoundItem, 'id'>) => {
    const id = `LF-${items.length + 1}`;
    const finalItem: LostFoundItem = { ...newItem, id, status: 'Unmatched', claimedBy: null };
    setItems(prev => [...prev, finalItem]);
    
    setHistory(prev => [...prev, {
      id: `H-${history.length + 1}`,
      itemId: finalItem.id,
      action: 'Reported',
      details: `Item "${finalItem.description}" reported by ${finalItem.reporterName}.`,
      timestamp: new Date().toLocaleString(),
    }]);

    handleCloseAddModal();
  };

  const handleClaimAction = (itemId: string, action: 'Release' | 'Return' | 'Reject', claimantName: string) => {
    const newStatus = action === 'Release' ? 'Released' : action === 'Return' ? 'Returned' : 'Rejected';
    
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status: newStatus, claimedBy: claimantName } : item
    ));

    setHistory(prev => [...prev, {
      id: `H-${history.length + 1}`,
      itemId: itemId,
      action: `Claim ${newStatus}`,
      details: `Claim for item ${itemId} was ${newStatus.toLowerCase()} by admin.`,
      timestamp: new Date().toLocaleString(),
    }]);

    setClaims(prev => prev.map(claim => 
      claim.itemId === itemId ? { ...claim, status: newStatus } : claim
    ));
  };

  return (
    <>
      {/* Header Section: Stacks on mobile, Side-by-Side on PC */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white flex-shrink-0">Lost & Found Management</h1>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <SearchBar 
            placeholder="Search items..." 
            value={searchQuery} 
            onChange={setSearchQuery} 
            className="w-full sm:w-64" 
          />
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors w-full sm:w-auto flex-shrink-0"
          >
            <Plus size={20} />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      <LostFoundGrid
        items={items}
        onViewClaims={handleOpenClaimsModal}
        onViewHistory={handleOpenHistoryModal}
      />

      <AddLostFoundModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} onSave={handleSaveItem} />
      <ClaimsListModal
        isOpen={isClaimsModalOpen}
        onClose={handleCloseClaimsModal}
        itemId={selectedItemId || ''}
        claims={claims.filter(c => c.itemId === selectedItemId)}
        onClaimAction={handleClaimAction}
      />
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        itemId={selectedItemId || ''}
        history={history.filter(h => h.itemId === selectedItemId)}
      />
    </>
  );
}