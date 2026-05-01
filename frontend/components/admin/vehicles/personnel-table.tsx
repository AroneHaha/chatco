// components/admin/vehicles/personnel-table.tsx
"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/admin/ui/data-table";
import { GlassCard } from "@/components/admin/ui/glass-card";
import { Edit, Trash, ChevronLeft, ChevronRight } from "lucide-react";
import { initialPersonnel } from "@/app/(admin)/vehicles/data/vehicles-data";
import type { Personnel } from "@/app/(admin)/vehicles/data/vehicles-data";

// REMOVED the local mockPersonnel array — now imported from vehicles-data.ts

const ITEMS_PER_PAGE = 10;

// ADDED PROPS FOR MODALS
interface PersonnelTableProps {
  searchQuery: string;
  onEdit: (personnel: Personnel) => void;
  onDelete: (personnel: Personnel) => void;
}

export function PersonnelTable({ searchQuery, onEdit, onDelete }: PersonnelTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = initialPersonnel.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const currentData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "role",
      label: "Role",
      render: (value: string) => {
        const isDriver = value === "Driver";
        return (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isDriver ? "bg-blue-500/15 text-blue-400" : "bg-amber-500/15 text-amber-400"}`}>
            {value}
          </span>
        );
      },
    },
    { key: "contact", label: "Contact" },
    {
      key: "actions",
      label: "Actions",
      align: 'center' as const,
      // ADDED _row TO ACCESS THE FULL ROW DATA
      render: (_: unknown, row: Personnel) => (
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={() => onEdit(row)} 
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => onDelete(row)} 
            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <GlassCard className="p-4 sm:p-6 flex flex-col gap-4">
      <div className="overflow-x-auto">
        <DataTable data={currentData} columns={columns} searchQuery={searchQuery} />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
        <p className="text-xs text-white/40 order-2 sm:order-1">
          Showing{" "}
          <span className="text-white/70 font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}</span>{" "}
          of <span className="text-white/70 font-medium">{filteredData.length}</span> personnel
        </p>

        <div className="flex items-center gap-2 order-1 sm:order-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white/60 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "text-white/50 hover:bg-white/10 hover:text-white"}`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <span className="sm:hidden text-xs text-white/50 font-medium px-2">{currentPage} / {totalPages}</span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white/60 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
