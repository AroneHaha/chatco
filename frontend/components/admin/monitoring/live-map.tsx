// components/admin/monitoring/live-map.tsx
import dynamic from 'next/dynamic';

const AdminCommuterMap = dynamic(() => import('@/components/admin/admin-commuter-map'), { 
  ssr: false,
  loading: () => <p className="text-white text-center">Loading map...</p> 
});

export function LiveMap() {
  // This component now acts as a wrapper
  return <AdminCommuterMap isDesktop={true} />;
}