import Link from "next/link";
import { Truck, Search, Users } from "lucide-react";
import type { VehicleItem, LostFoundItem, UserItem } from "@/app/(admin)/admin-dashboard/data/dashboard-data";

interface DashboardPreviewCardsProps {
  recentVehicles: VehicleItem[];
  recentLostFound: LostFoundItem[];
  recentUsers: UserItem[];
}

export function DashboardPreviewCards({ recentVehicles, recentLostFound, recentUsers }: DashboardPreviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Vehicles / Fleet */}
      <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#62A0EA]" /> Vehicles
          </h3>
          <Link href="/vehicles" className="text-xs text-[#62A0EA] hover:underline">View All</Link>
        </div>
        <div className="space-y-3 flex-1">
          {recentVehicles.map((v) => (
            <div key={v.unit} className="flex items-center justify-between bg-[#0E1628] rounded-md p-2.5">
              <div>
                <p className="text-xs font-semibold text-slate-200">{v.unit}</p>
                <p className="text-xs text-slate-500">{v.driver}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                v.status === "Active" ? "bg-sky-400/15 text-sky-400" : "bg-amber-400/15 text-amber-400"
              }`}>
                {v.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Lost & Found */}
      <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-[#62A0EA]" /> Lost & Found
          </h3>
          <Link href="/lost-found" className="text-xs text-[#62A0EA] hover:underline">View All</Link>
        </div>
        <div className="space-y-3 flex-1">
          {recentLostFound.map((item) => (
            <div key={item.item} className="flex items-center justify-between bg-[#0E1628] rounded-md p-2.5">
              <p className="text-xs text-slate-200">{item.item}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                item.status === "Returned" ? "bg-sky-400/15 text-sky-400" : 
                item.status === "Under Review" ? "bg-[#62A0EA]/15 text-[#62A0EA]" : "bg-amber-400/15 text-amber-400"
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* User Management */}
      <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#62A0EA]" /> Users
          </h3>
          <Link href="/users" className="text-xs text-[#62A0EA] hover:underline">View All</Link>
        </div>
        <div className="space-y-3 flex-1">
          {recentUsers.map((u) => (
            <div key={u.name} className="flex items-center justify-between bg-[#0E1628] rounded-md p-2.5">
              <div>
                <p className="text-xs font-semibold text-slate-200">{u.name}</p>
                <p className="text-xs text-slate-500">{u.role}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                u.status === "Active" ? "bg-sky-400/15 text-sky-400" : "bg-slate-500/15 text-slate-500"
              }`}>
                {u.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
