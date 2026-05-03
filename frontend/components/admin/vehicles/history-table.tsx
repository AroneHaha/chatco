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

        <div className="divide-y divide-[#162033]">
          {filteredPersonnel.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
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
                          <div className="space-y-2 pl-6 border-l-2 border-[#1E2D45]">
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
    </div>
  );
}