// components/admin/vehicles/driver-detail-modal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import {
  User,
  Phone,
  Car,
  Calendar,
  IdCard,
  MapPin,
  Home,
  Users,
  FileText,
  Loader2,
} from 'lucide-react';
import type { Personnel } from '@/app/(admin)/vehicles/data/vehicles-data';

interface DriverDetail {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birthday: string | null;
  contact: string;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_relationship: string | null;
  license_number: string;
  hire_date: string | null;
  profile_picture_url: string | null;
  status: string | null;
  vehicle: {
    id: string;
    unit_number: string;
    plate_number: string;
    route: string | null;
  } | null;
  conductor_partner: { id: string; name: string } | null;
  assigned_route: string;
}

interface ShiftLogEntry {
  shift_id: string;
  unit_number: string | null;
  plate_number: string | null;
  route: string | null;
  time_in: string | null;
  time_out: string | null;
  status: string;
}

interface ShiftLogsPage {
  data: ShiftLogEntry[];
  current_page: number;
  last_page: number;
  total: number;
}

const SHIFT_LOGS_PER_PAGE = 10;

interface DriverDetailModalProps {
  driver: Personnel | null;
  onClose: () => void;
}

function calculateAge(birthday: string | null): string {
  if (!birthday) return '—';
  try {
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age} years old`;
  } catch {
    return '—';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function DriverDetailModal({ driver, onClose }: DriverDetailModalProps) {
  const [details, setDetails] = useState<DriverDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  const [shiftLogs, setShiftLogs] = useState<ShiftLogEntry[]>([]);
  const [shiftLogsPage, setShiftLogsPage] = useState(0);
  const [shiftLogsTotal, setShiftLogsTotal] = useState<number | null>(null);
  const [shiftLogsHasMore, setShiftLogsHasMore] = useState(true);
  const [isShiftLogsLoading, setIsShiftLogsLoading] = useState(false);
  const [shiftLogsError, setShiftLogsError] = useState<string | null>(null);
  const [historyDate, setHistoryDate] = useState('');
  const shiftLogsListRef = useRef<HTMLDivElement>(null);
  const shiftLogsSentinelRef = useRef<HTMLDivElement>(null);
  // Tracks which driver+date combo the history list currently holds, so
  // switching tabs back and forth doesn't trigger a refetch — only a real
  // driver change or a new date filter does.
  const shiftLogsQueryKeyRef = useRef<string | null>(null);

  const fetchDetails = async () => {
    if (!driver) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to load driver details');
      }
      setDetails(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load driver details');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetches one page of shift history (10 at a time, newest first),
  // optionally scoped to a single calendar day. Page 1 replaces the list
  // (fresh load); later pages append (infinite scroll).
  const fetchShiftLogs = async (page: number, date: string) => {
    if (!driver || isShiftLogsLoading) return;
    setIsShiftLogsLoading(true);
    setShiftLogsError(null);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(SHIFT_LOGS_PER_PAGE) });
      if (date) params.set('date', date);
      const res = await fetch(
        `/api/admin/drivers/${driver.id}/shift-logs?${params.toString()}`,
        { headers: { Accept: 'application/json' } }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? 'Failed to load shift history');
      }
      const paginator = json.data as ShiftLogsPage;
      setShiftLogs(prev => (page === 1 ? paginator.data : [...prev, ...paginator.data]));
      setShiftLogsPage(paginator.current_page);
      setShiftLogsHasMore(paginator.current_page < paginator.last_page);
      setShiftLogsTotal(paginator.total);
    } catch (err) {
      setShiftLogsError(err instanceof Error ? err.message : 'Failed to load shift history');
    } finally {
      setIsShiftLogsLoading(false);
    }
  };

  useEffect(() => {
    if (driver) {
      fetchDetails();
      setActiveTab('info');
      setShiftLogs([]);
      setShiftLogsPage(0);
      setShiftLogsTotal(null);
      setShiftLogsHasMore(true);
      setShiftLogsError(null);
      setHistoryDate('');
      shiftLogsQueryKeyRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]);

  // Lazy-loads (or reloads, if the date filter changed) the first page only
  // once the History tab is actually opened — never fetched alongside
  // Personal Info, and never re-fetched just from switching tabs back and
  // forth with the same date filter still applied.
  useEffect(() => {
    if (activeTab !== 'history' || !driver) return;
    const key = `${driver.id}|${historyDate}`;
    if (shiftLogsQueryKeyRef.current === key) return;
    shiftLogsQueryKeyRef.current = key;
    setShiftLogs([]);
    setShiftLogsPage(0);
    setShiftLogsTotal(null);
    setShiftLogsHasMore(true);
    setShiftLogsError(null);
    fetchShiftLogs(1, historyDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, historyDate, driver?.id]);

  // Infinite scroll: only fetch the next page once the sentinel at the
  // bottom of the loaded list actually scrolls into view — no prefetching.
  useEffect(() => {
    if (activeTab !== 'history' || !shiftLogsHasMore) return;
    const root = shiftLogsListRef.current;
    const sentinel = shiftLogsSentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchShiftLogs(shiftLogsPage + 1, historyDate);
        }
      },
      { root, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, shiftLogsHasMore, shiftLogsPage, isShiftLogsLoading, historyDate]);

  if (!driver) return null;

  const fullName = details
    ? `${details.first_name} ${details.middle_name ? details.middle_name + ' ' : ''}${details.last_name}`.trim()
    : driver.name;

  const profilePic = details?.profile_picture_url
    ?? `https://placehold.co/150x150/0A1E33/62A0EA?text=${driver.name.charAt(0)}`;

  return (
    <Modal isOpen={!!driver} onClose={onClose} maxWidth="max-w-4xl" height="h-[min(680px,85vh)]">
      {/* ─── Header (full width) ─── */}
      <div className="flex items-start gap-4 mb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profilePic}
          alt={fullName}
          className="w-20 h-20 rounded-xl border-2 border-[#62A0EA]/25 flex-shrink-0 object-cover"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white truncate">{fullName}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-[#62A0EA]/15 text-[#62A0EA]">
              Driver
            </span>
            {details?.status && (
              <Badge variant={details.status === 'ACTIVE' ? 'success' : 'warning'}>
                {details.status}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-slate-600 font-mono mt-1.5">
            ID: {driver.id.slice(0, 8)}…
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-1 border-b border-[#1E2D45] mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'info'
              ? 'border-[#62A0EA] text-[#62A0EA]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Personal Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'history'
              ? 'border-[#62A0EA] text-[#62A0EA]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Assignment History
          {shiftLogsTotal !== null && (
            <span className="ml-1.5 text-[10px] text-slate-600 font-normal">
              ({shiftLogsTotal})
            </span>
          )}
        </button>
      </div>

      {isLoading && !details ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-[#0E1628] border border-[#1E2D45] rounded-md animate-pulse" />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-[#0E1628] border border-[#1E2D45] rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      ) : details && activeTab === 'info' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ═══════ COLUMN 1: Personal Information ═══════ */}
          <div className="space-y-5">
            {/* ─── Personal Information ─── */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2.5 flex items-center gap-2">
                <User size={13} />
                Personal Information
              </h3>
              <div className="space-y-2">
                {/* License Number */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <IdCard size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">License Number</p>
                    <p className="text-sm text-slate-300 truncate">{details.license_number || '—'}</p>
                  </div>
                </div>

                {/* Birth Date + Age */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <Calendar size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Birth Date</p>
                    <p className="text-sm text-slate-300">{formatDate(details.birthday)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-slate-600 uppercase">Age</p>
                    <p className="text-sm text-slate-400">{calculateAge(details.birthday)}</p>
                  </div>
                </div>

                {/* Contact Number */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <Phone size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Contact Number</p>
                    <p className="text-sm text-slate-300">{details.contact || '—'}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <Home size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Address</p>
                    <p className="text-sm text-slate-300">{details.address || '—'}</p>
                  </div>
                </div>

                {/* Hire Date */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <Calendar size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Date Hired</p>
                    <p className="text-sm text-slate-300">{formatDate(details.hire_date)}</p>
                  </div>
                </div>

                {/* Fixed Route */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <MapPin size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Fixed Assigned Route</p>
                    <p className="text-sm text-slate-300">{details.assigned_route}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ COLUMN 2: Emergency Contact + Assignment ═══════ */}
          <div className="space-y-5">
            {/* ─── Emergency Contact ─── */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2.5 flex items-center gap-2">
                <Users size={13} />
                Emergency Contact
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <User size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Contact Name</p>
                    <p className="text-sm text-slate-300 truncate">{details.emergency_contact_name || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-slate-600 uppercase">Relationship</p>
                    <p className="text-sm text-slate-400">{details.emergency_contact_relationship || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <Phone size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Contact Number</p>
                    <p className="text-sm text-slate-300">{details.emergency_contact_number || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Assignment Information ─── */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2.5 flex items-center gap-2">
                <Car size={13} />
                Assignment Information
              </h3>
              <div className="space-y-2">
                {/* Current Vehicle */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <Car size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Current Vehicle</p>
                    {details.vehicle ? (
                      <p className="text-sm text-slate-300">
                        {details.vehicle.unit_number} <span className="text-slate-500">({details.vehicle.plate_number})</span>
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Unassigned</p>
                    )}
                  </div>
                </div>

                {/* Current Conductor Partner */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <Users size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Current Conductor Partner</p>
                    {details.conductor_partner ? (
                      <p className="text-sm text-slate-300">{details.conductor_partner.name}</p>
                    ) : (
                      <p className="text-sm text-slate-500 italic">None</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : details && activeTab === 'history' ? (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs text-slate-500">
              {historyDate ? `Showing assignments for ${formatDate(historyDate)}` : 'Showing all assignments'}
            </p>
            <AdminDatePicker
              value={historyDate}
              onChange={setHistoryDate}
              accent="blue"
              align="right"
              ariaLabel="Filter assignment history by date"
            />
          </div>

          {shiftLogsError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md mb-3">
              <p className="text-sm text-red-400">{shiftLogsError}</p>
            </div>
          )}

          {shiftLogsPage === 0 && isShiftLogsLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-[#0E1628] border border-[#1E2D45] rounded-md animate-pulse" />
              ))}
            </div>
          ) : shiftLogs.length === 0 && !isShiftLogsLoading ? (
            <div className="text-center py-10">
              <FileText size={32} className="text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-600 italic">
                {historyDate ? `No assignments on ${formatDate(historyDate)}.` : 'No shift history yet.'}
              </p>
            </div>
          ) : (
            <div ref={shiftLogsListRef} className="space-y-2 max-h-[65vh] overflow-y-auto pr-2 scrollbar-themed rounded-lg">
              {shiftLogs.map((log) => (
                <div key={log.shift_id} className="p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#62A0EA]">
                      {log.unit_number || '—'}
                    </span>
                    <Badge variant={log.status === 'ACTIVE' ? 'success' : 'info'}>
                      {log.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <div>
                      <span className="text-slate-600">Plate:</span>{' '}
                      <span className="text-slate-400">{log.plate_number || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Route:</span>{' '}
                      <span className="text-slate-400">{log.route || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">In:</span>{' '}
                      <span className="text-slate-400">{formatDateTime(log.time_in)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Out:</span>{' '}
                      <span className="text-slate-400">{formatDateTime(log.time_out)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Infinite-scroll sentinel — fetches the next page only once
                  this scrolls into view inside the list's own scroll area. */}
              {shiftLogsHasMore && (
                <div ref={shiftLogsSentinelRef} className="flex items-center justify-center py-3">
                  {isShiftLogsLoading && (
                    <Loader2 size={16} className="animate-spin text-slate-500" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
