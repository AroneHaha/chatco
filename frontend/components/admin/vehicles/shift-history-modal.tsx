// components/admin/vehicles/shift-history-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { Clock, RefreshCw, User, MapPin, Calendar } from 'lucide-react';
import type { Vehicle } from '@/app/(admin)/vehicles/data/vehicles-data';

interface ShiftLogEntry {
  shift_id: string;
  conductor_name: string | null;
  driver_name: string | null;
  unit_number: string | null;
  plate_number: string | null;
  time_in: string | null;
  time_out: string | null;
  status: string;
  notes: string | null;
  vehicle?: { id: string; unit_number: string; plate_number: string } | null;
  driver?: { id: string; first_name: string; last_name: string } | null;
  route?: { id: string; name: string } | null;
}

interface ShiftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatDuration(timeIn: string | null, timeOut: string | null): string {
  if (!timeIn || !timeOut) return '—';
  try {
    const start = new Date(timeIn).getTime();
    const end = new Date(timeOut).getTime();
    const diffMs = end - start;
    if (diffMs <= 0) return '—';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  } catch {
    return '—';
  }
}

export function ShiftHistoryModal({ isOpen, onClose, vehicle }: ShiftHistoryModalProps) {
  const [logs, setLogs] = useState<ShiftLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    if (!vehicle) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shift-logs?vehicle_id=${encodeURIComponent(vehicle.id)}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to load shift logs');
      }
      // Laravel paginates this endpoint: { data: { data: [...], current_page, ... } }.
      // Fall back to a plain array in case the shape is ever un-paginated.
      const entries = data.data?.data ?? data.data;
      setLogs(Array.isArray(entries) ? (entries as ShiftLogEntry[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && vehicle) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vehicle?.id]);

  if (!vehicle) return null;

  const activeCount = logs.filter(l => l.status === 'ACTIVE').length;
  const endedCount = logs.filter(l => l.status === 'ENDED').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={20} className="text-[#62A0EA]" />
            <h2 className="text-lg sm:text-xl font-bold text-white">Shift History</h2>
          </div>
          <p className="text-xs text-slate-400">
            Unit <span className="font-semibold text-slate-300">{vehicle.plateNumber}</span> • Route <span className="font-semibold text-slate-300">{vehicle.route}</span>
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-1">{vehicle.id}</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          title="Refresh"
          className="p-2 text-slate-400 hover:text-white hover:bg-[#1A2540] rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-2.5 text-center">
          <p className="text-lg font-bold text-white">{logs.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Shifts</p>
        </div>
        <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-2.5 text-center">
          <p className="text-lg font-bold text-emerald-400">{activeCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Active</p>
        </div>
        <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-2.5 text-center">
          <p className="text-lg font-bold text-slate-400">{endedCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Ended</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Logs list */}
      <div className="max-h-[420px] overflow-y-auto pr-1 space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-[#0E1628] border border-[#1E2D45] rounded-md animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10">
            <Calendar size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No shift history for this vehicle yet.</p>
            <p className="text-slate-500 text-xs mt-1">Shifts will appear here once a conductor starts one on this unit.</p>
          </div>
        ) : (
          logs.map((log) => {
            const isActive = log.status === 'ACTIVE';
            return (
              <div key={log.shift_id} className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant={isActive ? 'success' : 'info'}>
                        {isActive ? 'ACTIVE' : 'ENDED'}
                      </Badge>
                      <span className="text-[10px] font-mono text-slate-500 truncate">
                        {log.shift_id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <User size={12} className="text-slate-500" />
                      <span>Conductor: <span className="font-medium">{log.conductor_name ?? '—'}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <User size={12} className="text-slate-500" />
                      <span>Driver: <span className="font-medium">{log.driver_name ?? '—'}</span></span>
                    </div>
                    {log.route?.name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <MapPin size={12} className="text-slate-500" />
                        <span>{log.route.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Time In</p>
                    <p className="text-xs text-slate-300 font-medium">{formatDateTime(log.time_in)}</p>
                    {!isActive && (
                      <>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1.5">Time Out</p>
                        <p className="text-xs text-slate-300 font-medium">{formatDateTime(log.time_out)}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Duration: {formatDuration(log.time_in, log.time_out)}</p>
                      </>
                    )}
                  </div>
                </div>
                {log.notes && (
                  <div className="mt-2 pt-2 border-t border-[#1E2D45]">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Notes</p>
                    <p className="text-xs text-slate-400">{log.notes}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-end pt-4 mt-3 border-t border-[#1E2D45]">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
