// components/admin/vehicles/shift-history-modal.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { Clock, User, MapPin, Calendar, MonitorSmartphone, ShieldAlert } from 'lucide-react';
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
  operating_device_id: string | null;
  operating_device_type: 'WEB' | 'MOBILE' | null;
  operating_device_claimed_at: string | null;
  synced_offline_cash_count?: number;
  latest_device_recovery?: {
    id: string;
    previous_device_type: 'WEB' | 'MOBILE' | null;
    reason: string;
    created_at: string;
  } | null;
  vehicle?: { id: string; unit_number: string; plate_number: string } | null;
  driver?: { id: string; first_name: string; last_name: string } | null;
  route?: { id: string; name: string } | null;
}

interface ShiftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

interface ShiftHistoryPageMeta {
  currentPage: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  perPage: number;
}

const SHIFT_HISTORY_PAGE_SIZE = 10;

const EMPTY_PAGE_META: ShiftHistoryPageMeta = {
  currentPage: 1,
  totalPages: 1,
  from: 0,
  to: 0,
  total: 0,
  perPage: SHIFT_HISTORY_PAGE_SIZE,
};

function pageMetaFrom(raw: Record<string, unknown> | undefined | null): ShiftHistoryPageMeta {
  if (!raw) return EMPTY_PAGE_META;

  const total = Number(raw.total ?? 0);
  const perPage = Number(raw.per_page ?? SHIFT_HISTORY_PAGE_SIZE);

  return {
    currentPage: Number(raw.current_page ?? 1),
    totalPages: Math.max(1, Number((raw.last_page ?? Math.ceil(total / perPage)) || 1)),
    from: Number(raw.from ?? 0),
    to: Number(raw.to ?? 0),
    total,
    perPage,
  };
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
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState<ShiftHistoryPageMeta>(EMPTY_PAGE_META);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryTarget, setRecoveryTarget] = useState<string | null>(null);
  const [recoveryReason, setRecoveryReason] = useState('');
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const activeVehicleIdRef = useRef<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!vehicle) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        vehicle_id: vehicle.id,
        page: String(page),
        per_page: String(SHIFT_HISTORY_PAGE_SIZE),
      });
      const res = await fetch(`/api/admin/shift-logs?${params.toString()}`, {
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
      setPageMeta(pageMetaFrom(data.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shift logs');
    } finally {
      setIsLoading(false);
    }
  }, [page, vehicle]);

  useEffect(() => {
    if (!isOpen || !vehicle) return;

    if (activeVehicleIdRef.current !== vehicle.id) {
      activeVehicleIdRef.current = vehicle.id;
      setLogs([]);
      setPageMeta(EMPTY_PAGE_META);
      setRecoveryTarget(null);
      setRecoveryReason('');
      setRiskAcknowledged(false);
      setRecoveryMessage(null);
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    fetchLogs();
  }, [fetchLogs, isOpen, page, vehicle]);

  const cancelRecovery = () => {
    setRecoveryTarget(null);
    setRecoveryReason('');
    setRiskAcknowledged(false);
  };

  const recoverDevice = async (shiftId: string) => {
    setIsRecovering(true);
    setError(null);
    setRecoveryMessage(null);
    try {
      const res = await fetch(`/api/admin/shifts/${encodeURIComponent(shiftId)}/device/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          reason: recoveryReason.trim(),
          acknowledge_unsynced_cash_risk: riskAcknowledged,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const validationMessage = data?.errors
          ? Object.values(data.errors as Record<string, string[]>).flat()[0]
          : null;
        throw new Error(validationMessage ?? data?.message ?? 'Unable to recover the operating device.');
      }

      cancelRecovery();
      setRecoveryMessage('Device ownership released. The conductor must claim this shift from a different device.');
      await fetchLogs();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to recover the operating device.');
    } finally {
      setIsRecovering(false);
    }
  };

  if (!vehicle) return null;

  const activeCount = logs.filter(l => l.status === 'ACTIVE').length;
  const endedCount = logs.filter(l => l.status === 'ENDED').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={20} className="text-[#62A0EA]" />
          <h2 className="text-lg sm:text-xl font-bold text-white">Shift History</h2>
        </div>
        <p className="text-xs text-slate-400">
          Unit <span className="font-semibold text-slate-300">{vehicle.plateNumber}</span>
        </p>
      </div>

      {/* Summary badges */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-2.5 text-center">
          <p className="text-lg font-bold text-white">{pageMeta.total}</p>
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

      {recoveryMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md mb-3">
          <p className="text-sm text-emerald-300">{recoveryMessage}</p>
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
                {isActive && (
                  <div className="mt-2 border-t border-[#1E2D45] pt-2">
                    <div className="flex items-start gap-2">
                      <MonitorSmartphone size={14} className="mt-0.5 shrink-0 text-sky-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Operating device</p>
                        {log.operating_device_id ? (
                          <>
                            <p className="text-xs font-semibold text-slate-200">
                              {log.operating_device_type ?? 'Unknown'} · ID ending {log.operating_device_id.slice(-8)}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Claimed {formatDateTime(log.operating_device_claimed_at)}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs font-semibold text-amber-300">Awaiting a conductor device claim</p>
                        )}
                        {log.latest_device_recovery && (
                          <div className="mt-1 text-[10px] text-amber-300/80">
                            <p>Last Admin recovery: {formatDateTime(log.latest_device_recovery.created_at)}</p>
                            <p className="line-clamp-2">Reason: {log.latest_device_recovery.reason}</p>
                          </div>
                        )}
                        <p className="mt-1 text-[10px] text-slate-500">
                          Server-confirmed offline Cash syncs: {log.synced_offline_cash_count ?? 0}. Unsynced device-only Cash is not visible to Admin.
                        </p>
                      </div>
                    </div>

                    {log.operating_device_id && recoveryTarget !== log.shift_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryTarget(log.shift_id);
                          setRecoveryReason('');
                          setRiskAcknowledged(false);
                          setError(null);
                          setRecoveryMessage(null);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
                      >
                        <ShieldAlert size={12} /> Recover lost device
                      </button>
                    )}

                    {recoveryTarget === log.shift_id && (
                      <div className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/5 p-3">
                        <p className="text-xs font-semibold text-amber-200">Emergency recovery only</p>
                        <p className="mt-1 text-[11px] leading-4 text-slate-400">
                          The server cannot see cash still stored only on a lost device. This action does not change transactions or remittance.
                        </p>
                        <textarea
                          value={recoveryReason}
                          onChange={(event) => setRecoveryReason(event.target.value)}
                          maxLength={500}
                          rows={3}
                          placeholder="Explain why the device cannot perform a safe release (minimum 10 characters)."
                          className="mt-2 w-full resize-none rounded-md border border-[#2B3A50] bg-[#07111F] px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                        />
                        <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] leading-4 text-slate-300">
                          <input
                            type="checkbox"
                            checked={riskAcknowledged}
                            onChange={(event) => setRiskAcknowledged(event.target.checked)}
                            className="mt-0.5"
                          />
                          I understand the unavailable device may contain unsynchronized cash that requires separate reconciliation.
                        </label>
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isRecovering}
                            onClick={cancelRecovery}
                            className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] text-slate-300 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isRecovering || recoveryReason.trim().length < 10 || !riskAcknowledged}
                            onClick={() => void recoverDevice(log.shift_id)}
                            className="rounded-md bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isRecovering ? 'Releasing…' : 'Confirm recovery'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

      {pageMeta.total > 0 && (
        <div className="mt-3">
          <TablePagination
            currentPage={pageMeta.currentPage}
            totalPages={pageMeta.totalPages}
            from={pageMeta.from}
            to={pageMeta.to}
            total={pageMeta.total}
            label="shifts"
            onPageChange={setPage}
          />
        </div>
      )}

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
