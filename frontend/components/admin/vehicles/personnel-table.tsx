// components/admin/vehicles/personnel-table.tsx
"use client";

import { useState } from "react";
import { DataTable } from "@/components/admin/ui/data-table";
import { TablePagination } from "@/components/admin/ui/table-pagination";
import { SearchBar } from "@/components/admin/ui/search-bar";
import { Edit, Eye, Trash, Plus, UserPlus } from "lucide-react";
import { formatLogDate } from "@/lib/utils/format";
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
  /** Called after an action in a detail modal changed the record (e.g. a
   *  conductor was disabled), so the list can show the new status. */
  onPersonnelChanged?: () => void;
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
  onPersonnelChanged,
  isLoading = false,
}: PersonnelTableProps) {
  const [selectedDriver, setSelectedDriver] = useState<Personnel | null>(null);
  const [selectedConductor, setSelectedConductor] = useState<Personnel | null>(null);

  // The detail modals hold the conductor's Reset Credentials / Disable
  // Account actions. Row double-click still opens them; the explicit button
  // below makes them reachable without knowing about the double-click.
  const openDetails = (p: Personnel) => {
    if (p.role === "Driver") {
      setSelectedDriver(p);
    } else if (p.role === "Conductor") {
      setSelectedConductor(p);
    }
  };

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
          <p className="min-w-0 truncate font-medium text-white">{value}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      // Role is a category, not an alert, so it's a quiet dot + label (same
      // treatment as the vehicle table's "Operating"). The dot keeps the
      // blue/amber role color already used by the avatar beside it.
      render: (value: string) => {
        const isDriver = value === "Driver";
        return (
          <span className="inline-flex items-center gap-2 text-sm text-slate-300">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${isDriver ? "bg-[#62A0EA]" : "bg-amber-400"}`}
            />
            {value}
          </span>
        );
      },
    },
    { key: "contact", label: "Contact", cellClassName: "truncate" },
    {
      key: "birthday",
      label: "Birthdate",
      cellClassName: "truncate",
      // Local midnight so a date-only value never shifts a day across timezones.
      render: (value: string | null) =>
        value ? formatLogDate(`${value}T00:00:00`) : <span className="text-slate-500">Not recorded</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (_: unknown, row: Personnel) => {
        const isActive = row.status === "ACTIVE";
        return (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                isActive ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
            <span className={`text-xs font-medium ${isActive ? "text-slate-300" : "text-slate-500"}`}>
              {isActive ? "Active" : "Deactivated"}
            </span>
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "center" as const,
      headerClassName: "w-32",
      cellClassName: "w-32",
      render: (_: unknown, row: Personnel) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(event) => { event.stopPropagation(); openDetails(row); }}
            onDoubleClick={(event) => event.stopPropagation()}
            aria-label={`View details for ${row.name}`}
            title="View details"
            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md transition-colors"
          >
            <Eye size={16} />
          </button>
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
            onRowDoubleClick={(item) => openDetails(item as Personnel)}
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
        onChanged={onPersonnelChanged}
      />
    </>
  );
}
