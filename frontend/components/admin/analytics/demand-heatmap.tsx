// components/admin/analytics/demand-heatmap.tsx
import dynamic from 'next/dynamic';

const AdminCommuterMap = dynamic(() => import('@/components/admin/admin-commuter-map'), { 
  ssr: false,
  loading: () => <p className="text-white text-center">Loading map...</p> 
});

export function DemandHeatmap() {
    return <AdminCommuterMap isDesktop={true} />;
}