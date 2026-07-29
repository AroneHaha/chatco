// components/admin/vehicles/personnel-table.tsx
"use client";

import { useState } from "react";
import { DataTable } from "@/components/admin/ui/data-table";
import { TablePagination } from "@/components/admin/ui/table-pagination";
import { Edit, Trash } from "lucide-react";
import type { Personnel } from "@/app/(admin)/vehicles/data/vehicles-data";
import { DriverDetailModal } from "@/components/admin/vehicles/driver-detail-modal";
import { ConductorDetailModal } from "@/components/admin/vehicles/conductor-detail-modal";

const ITEMS_PER_PAGE = 10;

interface PersonnelTableProps {
  personnel: Personnel[];
  searchQuery: string;
  onEdit: (personnel: Personnel) => void;
  onDelete: (personnel: Personnel) => void;
  // Kept for backwards compatibility — no longer used by the new detail modals
  // (they fetch their own data from the API). Will be removed in a future cleanup.
  driverProfiles?: Record<string, import("@/app/(admin)/vehicles/data/vehicles-data").DriverProfile>;
  driverRatings?: Record<string, import("@/app/(admin)/vehicles/data/vehicles-data").DriverRating[]>;
}

export function PersonnelTable({ personnel, searchQuery, onEdit, onDelete }: PersonnelTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<Personnel | null>(null);
  const [selectedConductor, setSelectedConductor] = useState<Personnel | null>(null);

  const filteredData = personnel.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const currentData = filteredData.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const columns = [
    {
      key: "name",
      label: "Personnel",
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
            <p className="text-[10px] text-slate-600 font-mono">ID {row.id}</p>
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
    { key: "contact", label: "Contact" },
    {
      key: "actions",
      label: "Actions",
      align: "center" as const,
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
      <div className="flex flex-col gap-4">
        {/* Double-click hint */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-white">Chatco Personnel</p>
          <p className="text-[10px] text-slate-500">
            Double-click any row for profile and assignment history
          </p>
        </div>

        <DataTable
          data={currentData}
          columns={columns}
          searchQuery=""
          emptyMessage="No personnel records found."
          height="32rem"
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

        <TablePagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          from={currentData.length ? (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0}
          to={(safeCurrentPage - 1) * ITEMS_PER_PAGE + currentData.length}
          total={filteredData.length}
          label="personnel"
          onPageChange={setCurrentPage}
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
