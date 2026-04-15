// app/(admin)/admin-dashboard/page.tsx
import { FinancialSummary } from '@/components/admin/dashboard/financial-summary';
import { RecentAlerts } from '@/components/admin/dashboard/recent-alerts';
import { PaymentMethodsChart } from '@/components/admin/dashboard/payment-methods-chart';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { DollarSign, Users, AlertTriangle, Receipt } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Today's Revenue" value="₱15,450.50" icon={DollarSign} trend="+12.5%" trendUp={true} />
        <MetricCard title="Active Shifts" value="24" icon={Users} trend="+2" trendUp={true} />
        <MetricCard title="Pending Remittances" value="5" icon={Receipt} trend="-3" trendUp={false} />
        <MetricCard title="Active Alerts" value="2" icon={AlertTriangle} trend="+1" trendUp={false} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <PaymentMethodsChart />
        </div>
        <div className="xl:col-span-1 space-y-6">
          <FinancialSummary />
          <RecentAlerts />
        </div>
      </div>
    </>
  );
}