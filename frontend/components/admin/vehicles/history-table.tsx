"use client";

import { useState } from "react";
import { ChevronDown, UserX, FileText } from "lucide-react";

interface TerminatedPerson {
  id: number;
  name: string;
  role: string;
  contact: string;
  status: 'Terminated' | 'Resigned';
  reason: string;
  terminatedDate: string;
  lastVehicle: string;
}

interface ShiftLog {
  id: string;
  personnelName: string;
  role: string;
  vehicle: string;
  shiftDate: string;
  details: string;
}

interface HistoryTableProps {
  terminatedPersonnel: TerminatedPerson[];
  shiftHistoryLog: ShiftLog[];
  searchQuery: string;
}

export function HistoryTable({ terminatedPersonnel, shiftHistoryLog, searchQuery }: HistoryTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filter personnel based on search
  const filteredPersonnel = terminatedPersonnel.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.lastVehicle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Terminated Personnel List */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserX size={18} className="text-red-400" />
            <h3 className="text-sm font-semibold text-white">Separated Personnel</h3>
          </div>
          <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold">
            {filteredPersonnel.length} Records
          </span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {filteredPersonnel.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-sm">
              No terminated personnel records found.
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
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm flex-shrink-0">
                        {person.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white flex items-center gap-2">
                          {person.name}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            person.status === 'Terminated' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'
                          }`}>
                            {person.status}
                          </span>
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">{person.role} • Last assigned: {person.lastVehicle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-white/50">Separated: {person.terminatedDate}</p>
                        <p className="text-[11px] text-white/30 mt-0.5 italic">{person.reason}</p>
                      </div>
                      <ChevronDown size={16} className={`text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded History Details */}
                  {isExpanded && (
                    <div className="bg-black/20 border-t border-white/[0.04] p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white/[0.03] p-3 rounded-lg border border-white/[0.04]">
                          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Contact Number</p>
                          <p className="text-sm text-white/70">{person.contact}</p>
                        </div>
                        <div className="bg-white/[0.03] p-3 rounded-lg border border-white/[0.04]">
                          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Reason for Separation</p>
                          <p className="text-sm text-red-300">{person.reason}</p>
                        </div>
                      </div>

                      {/* Shift History Logs for this person */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={14} className="text-white/30" />
                          <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Past Shift History Logs</p>
                        </div>
                        
                        {personnelLogs.length === 0 ? (
                          <p className="text-xs text-white/20 italic pl-6">No detailed shift logs available for this user.</p>
                        ) : (
                          <div className="space-y-2 pl-6 border-l-2 border-white/[0.06]">
                            {personnelLogs.map((log) => (
                              <div key={log.id} className="relative bg-white/[0.02] p-3 rounded-md">
                                <div className="absolute -left-[25px] top-3 w-2 h-2 rounded-full bg-white/20"></div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-[#62A0EA]">{log.shiftDate}</span>
                                  <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded">Unit: {log.vehicle}</span>
                                </div>
                                <p className="text-xs text-white/50">{log.details}</p>
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
    </div>
  );
}