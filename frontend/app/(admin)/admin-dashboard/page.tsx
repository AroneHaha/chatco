// app/(admin)/admin-dashboard/page.tsx
import { FinancialSummary } from '@/components/admin/dashboard/financial-summary';
import { RecentAlerts } from '@/components/admin/dashboard/recent-alerts';
import { PaymentMethodsChart } from '@/components/admin/dashboard/payment-methods-chart';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { DollarSign, Users, AlertTriangle, Receipt } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
        <MetricCard title="Today's Revenue" value="₱15,450.50" icon={DollarSign} trend="+12.5%" trendUp={true} />
        <MetricCard title="Active Shifts" value="24" icon={Users} trend="+2" trendUp={true} />
        <MetricCard title="Pending Remittances" value="5" icon={Receipt} trend="-3" trendUp={false} />
        <MetricCard title="Active Alerts" value="2" icon={AlertTriangle} trend="+1" trendUp={false} />
      </div>

      <div className="space-y-6">
        <PaymentMethodsChart />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <FinancialSummary />
          <RecentAlerts />
        </div>
      </div>
    </>
  );
}