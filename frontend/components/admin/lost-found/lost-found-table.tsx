// components/admin/lost-found/lost-found-table.tsx
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Badge } from '@/components/admin/ui/badge';
import { Eye, Edit, Trash } from 'lucide-react';

// Mock data for the items
const mockItems = [
  {
    id: 'LF-01',
    description: 'Black compact umbrella with a curved handle. Found on the front seat.',
    reporterName: 'Commuter John Doe',
    reporterRole: 'Commuter',
    status: 'Unmatched',
    imageUrl: 'https://images.unsplash.com/photo-1572400547114-3c2a8b7d1b1b?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-15 08:30 AM',
  },
  {
    id: 'LF-02',
    description: 'Green leather wallet with multiple card slots. Contains cash.',
    reporterName: 'Conductor Juan',
    reporterRole: 'Conductor',
    status: 'Matched',
    imageUrl: 'https://images.unsplash.com/photo-1564588766842-70c8283a8b0a?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-15 09:15 AM',
  },
  {
    id: 'LF-03',
    description: 'Phone charger (Type-C) and a pair of wired earphones in a small pouch.',
    reporterName: 'Commuter Jane Smith',
    reporterRole: 'Commuter',
    status: 'Returned',
    imageUrl: 'https://images.unsplash.com/photo-1596462334453-4c025554b4a1?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-14 04:00 PM',
  },
  {
    id: 'LF-04',
    description: 'A single house key with a red plastic keychain.',
    reporterName: 'Driver Pedro',
    reporterRole: 'Driver',
    status: 'Unmatched',
    imageUrl: 'https://images.unsplash.com/photo-1588426811338-3c2a8b7d1b1b?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-15 11:45 AM',
  },
  {
    id: 'LF-05',
    description: 'Blue water bottle, half-full. Found near the back door.',
    reporterName: 'Conductor Maria',
    reporterRole: 'Conductor',
    status: 'Unmatched',
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb14f0d9d84c?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-15 01:20 PM',
  },
  {
    id: 'LF-06',
    description: 'A worn-out paperback novel with a blue cover.',
    reporterName: 'Commuter Carlos Cruz',
    reporterRole: 'Commuter',
    status: 'Matched',
    imageUrl: 'https://images.unsplash.com/photo-1544947950-8b0f8ba719f8?w=400&h=400&auto=format&fit=crop',
    reportedAt: '2024-04-13 10:00 AM',
  },
];

export function LostFoundTable() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {mockItems.map((item) => (
        <GlassCard key={item.id} className="overflow-hidden group cursor-pointer">
          {/* Image Container */}
          <div className="relative h-48 bg-gray-800">
            <img
              src={item.imageUrl}
              alt={item.description}
              className="w-full h-full object-cover"
            />
            {/* Status Badge Overlay */}
            <div className="absolute top-2 right-2">
              <Badge variant={item.status === 'Returned' ? 'success' : item.status === 'Matched' ? 'warning' : 'danger'}>
                {item.status}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-white truncate mb-2" title={item.description}>
              {item.description}
            </h3>
            <div className="space-y-1 text-xs text-gray-400">
              <p>Reported by: <span className="text-gray-300">{item.reporterName}</span></p>
              <p>Role: <span className="text-gray-300">{item.reporterRole}</span></p>
              <p>Date: <span className="text-gray-300">{item.reportedAt}</span></p>
            </div>
          </div>

          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-4">
            <button className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30">
              <Eye size={20} />
            </button>
            <button className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30">
              <Edit size={20} />
            </button>
            <button className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30">
              <Trash size={20} />
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}