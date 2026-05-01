// components/admin/vehicles/personnel-table.tsx
"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/admin/ui/data-table";
import { GlassCard } from "@/components/admin/ui/glass-card";
import { Edit, Trash, ChevronLeft, ChevronRight } from "lucide-react";

const mockPersonnel = [
  { id: 1, name: "Boy Pick-Up Dela Cruz", role: "Driver", contact: "0917-123-4567" },
  { id: 2, name: "Nardo Putik", role: "Conductor", contact: "0918-234-5678" },
  { id: 3, name: "Tikboy Saksakan", role: "Driver", contact: "0919-345-6789" },
  { id: 4, name: "Jobert Sucaldito", role: "Conductor", contact: "0920-456-7890" },
  { id: 5, name: "Dodong Bullet", role: "Driver", contact: "0921-567-8901" },
  { id: 6, name: "Kolokoy Gwapings", role: "Conductor", contact: "0922-678-9012" },
  { id: 7, name: "Mang Juan Tamad", role: "Driver", contact: "0923-789-0123" },
  { id: 8, name: "Moymoy Palaboy", role: "Conductor", contact: "0924-890-1234" },
  { id: 9, name: "Jepoy Pogi", role: "Driver", contact: "0925-901-2345" },
  { id: 10, name: "Apeng Daldal", role: "Conductor", contact: "0926-012-3456" },
  { id: 11, name: "Cardo Dalisay", role: "Driver", contact: "0927-123-4568" },
  { id: 12, name: "Chokolang Sosyal", role: "Conductor", contact: "0928-234-5679" },
  { id: 13, name: "Kakang Berto", role: "Driver", contact: "0929-345-6780" },
  { id: 14, name: "Bebe Kikay", role: "Conductor", contact: "0930-456-7891" },
  { id: 15, name: "Rocky Salumbides", role: "Driver", contact: "0931-567-8902" },
  { id: 16, name: "Elmer Supsup", role: "Conductor", contact: "0932-678-9013" },
  { id: 17, name: "Bunsoy Reacts", role: "Driver", contact: "0933-789-0124" },
  { id: 18, name: "Waway Gwapito", role: "Conductor", contact: "0934-890-1235" },
  { id: 19, name: "Tito Bobot", role: "Driver", contact: "0935-901-2346" },
  { id: 20, name: "Kokoy Palaboy", role: "Conductor", contact: "0936-012-3457" },
];

const ITEMS_PER_PAGE = 10;

// ADDED PROPS FOR MODALS
interface PersonnelTableProps {
  searchQuery: string;
  onEdit: (personnel: any) => void;
  onDelete: (personnel: any) => void;
}

export function PersonnelTable({ searchQuery, onEdit, onDelete }: PersonnelTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = mockPersonnel.filter(
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
      // ADDED _row TO ACCESS THE FULL ROW DATA
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
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