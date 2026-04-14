// components/admin/monitoring/live-map.tsx
import { MapPin } from 'lucide-react'; // FIX: Added the import for MapPin

export function LiveMap() {
  return (
    <div className="bg-white p-4 rounded-lg shadow h-full min-h-[500px] flex items-center justify-center">
      <div className="text-center">
        <MapPin className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-600 font-medium">Live Map View</p>
        <p className="text-sm text-gray-500">Integration with map library (e.g., Leaflet, Google Maps) will go here.</p>
        <p className="text-sm text-gray-500">It will display real-time vehicle locations and alerts.</p>
      </div>
    </div>
  );
}