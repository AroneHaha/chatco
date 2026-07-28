// components/admin/vehicles/history-table.tsx
"use client";

import { useState, useMemo } from "react";
import { ChevronDown, UserX, FileText, Clock, ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { TerminatedPersonnel, ShiftLog } from "@/app/(admin)/vehicles/data/vehicles-data";

interface HistoryTableProps {
  terminatedPersonnel: TerminatedPersonnel[];
  shiftHistoryLog: ShiftLog[];
  searchQuery: string;
}

const LOGS_PER_PAGE = 10;

export function HistoryTable({ terminatedPersonnel, shiftHistoryLog, searchQuery }: HistoryTableProps) {
  const [historyTab, setHistoryTab] = useState<"terminated" | "shifts">("terminated");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logPage, setLogPage] = useState(1);

  // Reset to page 1 whenever the search filter changes — uses the
  // "adjust state during render" pattern (conditional setState during
  // render) instead of useEffect. This is the React-recommended way to
  // reset state on prop change (avoids the react-hooks/set-state-in-effect
  // lint error and an extra render cycle).
  // See: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevSearch, setPrevSearch] = useState(searchQuery);
  if (searchQuery !== prevSearch) {
    setPrevSearch(searchQuery);
    setLogPage(1);
  }

  // ── Filter terminated personnel based on search ──
  const filteredPersonnel = terminatedPersonnel.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.lastVehicle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Filter shift logs based on search ──
  // Matches on personnelName, role, vehicle — same fields the user sees.
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return shiftHistoryLog;
    return shiftHistoryLog.filter((log) =>
      log.personnelName.toLowerCase().includes(q) ||
      log.role.toLowerCase().includes(q) ||
      log.vehicle.toLowerCase().includes(q)
    );
  }, [shiftHistoryLog, searchQuery]);

  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  // Clamp the current page in case the filtered list shrank (e.g. user
  // was on page 3, then searched and now there's only 1 page).
  const safePage = Math.min(logPage, totalLogPages);
  const currentLogs = filteredLogs.slice((safePage - 1) * LOGS_PER_PAGE, safePage * LOGS_PER_PAGE);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-[#1E2D45] bg-[#0E1628] p-1">
        <button
          onClick={() => setHistoryTab("terminated")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
            historyTab === "terminated" ? "bg-red-400/15 text-red-300" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <UserX size={14} />
          Terminated History
          <span className="rounded bg-black/20 px-1.5 py-0.5">{filteredPersonnel.length}</span>
        </button>
        <button
          onClick={() => setHistoryTab("shifts")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
            historyTab === "shifts" ? "bg-[#62A0EA]/15 text-[#62A0EA]" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Clock size={14} />
          Recent Shift History
          <span className="rounded bg-black/20 px-1.5 py-0.5">{filteredLogs.length}</span>
        </button>
      </div>
      {/* ───────────────────────────────────────────────────────────────
          SECTION 1: Separated Personnel
          (Empty until a /admin/terminated backend endpoint exists that
          lists soft-deleted drivers/conductors with termination metadata.)
          ─────────────────────────────────────────────────────────────── */}
      {historyTab === "terminated" && (
      <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#162033] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserX size={18} className="text-red-400" />
            <h3 className="text-sm font-semibold text-white">Separated Personnel</h3>
          </div>
          <span className="text-xs bg-red-400/10 text-red-400 px-2 py-0.5 rounded-md font-bold">
            {filteredPersonnel.length} Records
          </span>
        </div>

        <div className="divide-y divide-[#162033] max-h-[56vh] overflow-y-auto scrollbar-themed">
          {filteredPersonnel.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm space-y-2">
              <p>No terminated personnel records found{searchQuery ? ' for this search' : ''}.</p>
              {!searchQuery && (
                <p className="text-xs text-slate-600 flex items-center justify-center gap-1.5">
                  <Info size={12} className="flex-shrink-0" />
                  Use the trash icon on the Personnel tab to remove a driver or
                  conductor — they&apos;ll appear here with their termination reason.
                </p>
              )}
            </div>
          ) : (
            filteredPersonnel.map((person) => {
              const isExpanded = expandedId === person.id;
              // Get specific logs for this person
              const personnelLogs = shiftHistoryLog.filter(log => log.personnelName === person.name);

              return (
                <div key={person.id} className="transition-all">
                  {/* Main Clickable Row */}
                  <button
                    onClick={() => toggleExpand(person.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#1A2540] transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center text-red-400 font-bold text-sm flex-shrink-0">
                        {person.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white flex items-center gap-2">
                          {person.name}
                          <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${
                            person.status === 'Terminated' ? 'bg-red-400/15 text-red-400' : 'bg-amber-400/15 text-amber-400'
                          }`}>
                            {person.status}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{person.role} • Last assigned: {person.lastVehicle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-slate-400">Separated: {person.terminatedDate}</p>
                        <p className="text-xs text-slate-500 mt-0.5 italic">{person.reason}</p>
                      </div>
                      <ChevronDown size={16} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded History Details */}
                  {isExpanded && (
                    <div className="bg-[#0E1628] border-t border-[#162033] p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-[#0B1120] p-3 rounded-md border border-[#162033]">
                          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Contact Number</p>
                          <p className="text-sm text-slate-300">{person.contact}</p>
                        </div>
                        <div className="bg-[#0B1120] p-3 rounded-md border border-[#162033]">
                          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Reason for Separation</p>
                          <p className="text-sm text-red-300">{person.reason}</p>
                        </div>
                      </div>

                      {/* Shift History Logs for this person */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={14} className="text-slate-500" />
                          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Past Shift History Logs</p>
                        </div>

                        {personnelLogs.length === 0 ? (
                          <p className="text-xs text-slate-600 italic pl-6">No detailed shift logs available for this user.</p>
                        ) : (
                          <div className="space-y-2 pl-6 border-l-2 border-[#1E2D45] max-h-52 overflow-y-auto pr-2 scrollbar-themed">
                            {personnelLogs.map((log) => (
                              <div key={log.id} className="relative bg-[#131C2E] p-3 rounded-md">
                                <div className="absolute -left-[25px] top-3 w-2 h-2 rounded-full bg-slate-600"></div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-[#62A0EA]">{log.shiftDate}</span>
                                  <span className="text-xs text-slate-500 bg-[#0E1628] px-2 py-0.5 rounded-md">Unit: {log.vehicle}</span>
                                </div>
                                <p className="text-xs text-slate-400">{log.details}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* ───────────────────────────────────────────────────────────────
          SECTION 2: Recent Shift History
          Pulled from /api/admin/shift-logs (every shift_log row in the DB,
          newest first). Each backend row is split into two frontend entries
          (one for the driver, one for the conductor) by vehicles-data.ts,
          so this list shows ALL personnel shift activity in one timeline.
          ─────────────────────────────────────────────────────────────── */}
      {historyTab === "shifts" && (
      <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#162033] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#62A0EA]" />
            <h3 className="text-sm font-semibold text-white">Recent Shift History</h3>
          </div>
          <span className="text-xs bg-[#62A0EA]/10 text-[#62A0EA] px-2 py-0.5 rounded-md font-bold">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'Entry' : 'Entries'}
          </span>
        </div>

        {currentLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm space-y-2">
            <p>No shift history records found{searchQuery ? ' for this search' : ''}.</p>
            {!searchQuery && (
              <p className="text-xs text-slate-600">
                Shift logs appear here once conductors start their shifts via
                the Unit Verification page.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto scrollbar-themed">
              {currentLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-3 hover:border-[#62A0EA]/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-white truncate">
                        {log.personnelName}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0 ${
                        log.role === 'Driver'
                          ? 'bg-[#62A0EA]/15 text-[#62A0EA]'
                          : 'bg-amber-400/15 text-amber-400'
                      }`}>
                        {log.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
                      <span className="font-medium text-[#62A0EA]">{log.shiftDate}</span>
                      <span className="bg-[#131C2E] px-2 py-0.5 rounded-md">Unit: {log.vehicle}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{log.details}</p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalLogPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-[#162033]">
                <p className="text-xs text-slate-500">
                  Showing {(safePage - 1) * LOGS_PER_PAGE + 1}–
                  {Math.min(safePage * LOGS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLogPage((p) => Math.max(p - 1, 1))}
                    disabled={safePage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-400 bg-[#0E1628] border border-[#1E2D45] rounded-md hover:bg-[#1A2540] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span className="text-xs text-slate-500 px-2">
                    Page {safePage} of {totalLogPages}
                  </span>
                  <button
                    onClick={() => setLogPage((p) => Math.min(p + 1, totalLogPages))}
                    disabled={safePage === totalLogPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-400 bg-[#0E1628] border border-[#1E2D45] rounded-md hover:bg-[#1A2540] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}
