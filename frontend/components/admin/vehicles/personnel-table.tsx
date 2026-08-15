// components/admin/vehicles/personnel-table.tsx
"use client";

import { useState } from "react";
import { DataTable } from "@/components/admin/ui/data-table";
import { TablePagination } from "@/components/admin/ui/table-pagination";
import { SearchBar } from "@/components/admin/ui/search-bar";
import { Edit, Trash, IdCard, Plus, UserPlus } from "lucide-react";
import type { PageMeta, Personnel, PersonnelRoleFilter } from "@/app/(admin)/vehicles/data/vehicles-data";
import { DriverDetailModal } from "@/components/admin/vehicles/driver-detail-modal";
import { ConductorDetailModal } from "@/components/admin/vehicles/conductor-detail-modal";
import { SkeletonTable } from "@/components/admin/ui/skeleton";

interface PersonnelTableProps {
  personnel: Personnel[];
  searchQuery: string;
  roleFilter: PersonnelRoleFilter;
  page: PageMeta;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (role: PersonnelRoleFilter) => void;
  onAddDriver: () => void;
  onCreateConductor: () => void;
  onEdit: (personnel: Personnel) => void;
  onDelete: (personnel: Personnel) => void;
  isLoading?: boolean;
  // Kept for backwards compatibility — no longer used by the new detail modals
  // (they fetch their own data from the API). Will be removed in a future cleanup.
  driverProfiles?: Record<string, import("@/app/(admin)/vehicles/data/vehicles-data").DriverProfile>;
  driverRatings?: Record<string, import("@/app/(admin)/vehicles/data/vehicles-data").DriverRating[]>;
}

export function PersonnelTable({
  personnel,
  searchQuery,
  roleFilter,
  page,
  onPageChange,
  onSearchChange,
  onRoleFilterChange,
  onAddDriver,
  onCreateConductor,
  onEdit,
  onDelete,
  isLoading = false,
}: PersonnelTableProps) {
  const [selectedDriver, setSelectedDriver] = useState<Personnel | null>(null);
  const [selectedConductor, setSelectedConductor] = useState<Personnel | null>(null);

  const columns = [
    {
      key: "name",
      label: "Personnel",
      cellClassName: "min-w-0",
      render: (value: string, row: Personnel) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 ${
            row.role === "Driver"
              ? "bg-[#62A0EA]/10 border-[#62A0EA]/25 text-[#62A0EA]"
              : "bg-amber-400/10 border-amber-400/25 text-amber-400"
          }`}>
            {value.split(" ").map(part => part[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{value}</p>
            <p className="flex items-center gap-1 text-[10px] text-slate-600 font-mono">
              <IdCard size={10} />
              <span className="truncate">{row.id}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (value: string) => {
        const isDriver = value === "Driver";
        return (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
              isDriver
                ? "bg-[#62A0EA]/15 text-[#62A0EA]"
                : "bg-amber-400/15 text-amber-400"
            }`}
          >
            {value}
          </span>
        );
      },
    },
    { key: "contact", label: "Contact", cellClassName: "truncate" },
    {
      key: "actions",
      label: "Actions",
      align: "center" as const,
      headerClassName: "w-24",
      cellClassName: "w-24",
      render: (_: unknown, row: Personnel) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(event) => { event.stopPropagation(); onEdit(row); }}
            onDoubleClick={(event) => event.stopPropagation()}
            aria-label={`Edit ${row.name}`}
            title="Edit personnel"
            className="p-1.5 text-slate-400 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10 rounded-md transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={(event) => { event.stopPropagation(); onDelete(row); }}
            onDoubleClick={(event) => event.stopPropagation()}
            aria-label={`Remove ${row.name}`}
            title="Remove personnel"
            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
          >
            <Trash size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-[#1E2D45] bg-[#111A2B] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBar
              placeholder="Search personnel..."
              value={searchQuery}
              onChange={onSearchChange}
              className="min-w-0 w-full sm:w-80"
            />
            <select
              value={roleFilter}
              onChange={(event) => onRoleFilterChange(event.target.value as PersonnelRoleFilter)}
              aria-label="Filter personnel by role"
              className="h-10 rounded-lg border border-[#1E2D45] bg-[#0E1628] px-3 text-sm text-slate-200 outline-none transition-colors focus:border-[#62A0EA]/50 focus:ring-1 focus:ring-[#62A0EA]/30"
            >
              <option value="all">All personnel</option>
              <option value="driver">Drivers</option>
              <option value="conductor">Conductors</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={onCreateConductor}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#62A0EA] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A8BD4] sm:w-44"
            >
              <UserPlus size={18} />
              <span>Conductor</span>
            </button>
            <button
              onClick={onAddDriver}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#62A0EA] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A8BD4] sm:w-44"
            >
              <Plus size={18} />
              <span>Add Driver</span>
            </button>
          <span className="rounded-md bg-[#62A0EA]/10 px-2 py-1 text-xs font-bold text-[#62A0EA]">
            {page.total} Records
          </span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-[calc(100dvh-18rem)] min-h-64 overflow-hidden rounded-lg">
            <SkeletonTable rows={8} columns={4} />
          </div>
        ) : (
          <DataTable
            data={personnel}
            columns={columns}
            searchQuery=""
            emptyMessage="No personnel records found."
            height="calc(100dvh - 18rem)"
            stickyHeader
            allowHorizontalScroll={false}
            tableClassName="table-fixed"
            onRowDoubleClick={(item) => {
              const p = item as Personnel;
              if (p.role === "Driver") {
                setSelectedDriver(p);
              } else if (p.role === "Conductor") {
                setSelectedConductor(p);
              }
            }}
          />
        )}

        <TablePagination
          currentPage={page.currentPage}
          totalPages={page.totalPages}
          from={page.from}
          to={page.to}
          total={page.total}
          label="personnel"
          onPageChange={onPageChange}
        />
      </div>

      {/* Driver Detail Modal — opens on double-click of a Driver row */}
      <DriverDetailModal
        driver={selectedDriver}
        onClose={() => setSelectedDriver(null)}
      />

      {/* Conductor Detail Modal — opens on double-click of a Conductor row */}
      <ConductorDetailModal
        conductor={selectedConductor}
        onClose={() => setSelectedConductor(null)}
      />
    </>
  );
}
