// components/admin/vehicles/conductor-detail-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import {
  User,
  Car,
  Calendar,
  MapPin,
  Users,
  Clock,
  FileText,
  RefreshCw,
  AtSign,
  KeyRound,
  Ban,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { Personnel } from '@/app/(admin)/vehicles/data/vehicles-data';

interface ConductorDetail {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birthday: string | null;
  profile_picture_url: string | null;
  generated_username: string | null;
  vehicle: {
    id: string;
    unit_number: string;
    plate_number: string;
    route: string | null;
  } | null;
  driver_partner: { id: string; name: string } | null;
  assigned_route: string;
  shift_logs: Array<{
    shift_id: string;
    unit_number: string | null;
    plate_number: string | null;
    route: string | null;
    driver_name: string | null;
    time_in: string | null;
    time_out: string | null;
    status: string;
  }>;
}

interface ConductorDetailModalProps {
  conductor: Personnel | null;
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

export function ConductorDetailModal({ conductor, onClose }: ConductorDetailModalProps) {
  const [details, setDetails] = useState<ConductorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'reset' | 'disable' | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleResetCredentials = async () => {
    if (!conductor) return;
    setActionLoading('reset');
    setActionError(null);
    setActionResult(null);
    try {
      const res = await fetch(`/api/admin/conductors/${conductor.id}/reset-credentials`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to reset credentials.');
      }
      const d = data.data;
      setActionResult(`New credentials — Username: ${d.generated_username} | Password: ${d.generated_password}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reset credentials.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisableAccount = async () => {
    if (!conductor) return;
    setActionLoading('disable');
    setActionError(null);
    setActionResult(null);
    try {
      const res = await fetch(`/api/admin/conductors/${conductor.id}/disable`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to disable account.');
      }
      setActionResult('Account disabled. All sessions revoked — the conductor cannot log in until credentials are reset.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to disable account.');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchDetails = async () => {
    if (!conductor) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/conductors/${conductor.id}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Failed to load conductor details');
      }
      setDetails(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conductor details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (conductor) {
      fetchDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conductor?.id]);

  if (!conductor) return null;

  const fullName = details
    ? `${details.first_name} ${details.middle_name ? details.middle_name + ' ' : ''}${details.last_name}`.trim()
    : conductor.name;

  const profilePic = details?.profile_picture_url
    ?? `https://placehold.co/150x150/0A1E33/F59E0B?text=${conductor.name.charAt(0)}`;

  return (
    <Modal isOpen={!!conductor} onClose={onClose} maxWidth="max-w-4xl">
      {/* ─── Header (full width) ─── */}
      <div className="flex items-start gap-4 mb-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profilePic}
          alt={fullName}
          className="w-20 h-20 rounded-xl border-2 border-amber-400/25 flex-shrink-0 object-cover"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white truncate">{fullName}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-400/15 text-amber-400">
              Conductor
            </span>
            <Badge variant="success">ACTIVE</Badge>
          </div>
          <p className="text-[10px] text-slate-600 font-mono mt-1.5">
            ID: {conductor.id.slice(0, 8)}…
          </p>
        </div>
        <button
          onClick={fetchDetails}
          disabled={isLoading}
          title="Refresh"
          className="p-2 text-slate-400 hover:text-white hover:bg-[#1A2540] rounded-md transition-colors flex-shrink-0"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Action Result / Error Banner */}
      {actionResult && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
          <p className="text-xs text-emerald-400 break-all font-mono">{actionResult}</p>
        </div>
      )}
      {actionError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
          <p className="text-xs text-red-400">{actionError}</p>
        </div>
      )}

      {/* Admin Actions — Reset Credentials + Disable Account */}
      {details && (
        <div className="mb-5 flex gap-2">
          <button
            onClick={handleResetCredentials}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'reset' ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Reset Credentials
          </button>
          <button
            onClick={handleDisableAccount}
            disabled={actionLoading !== null}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading === 'disable' ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
            Disable Account
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {isLoading && !details ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-[#0E1628] border border-[#1E2D45] rounded-md animate-pulse" />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-[#0E1628] border border-[#1E2D45] rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      ) : details ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ═══════ LEFT COLUMN: Personal + Assignment Info ═══════ */}
          <div className="space-y-5">
            {/* ─── Personal Information ─── */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2.5 flex items-center gap-2">
                <User size={13} />
                Personal Information
              </h3>
              <div className="space-y-2">
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

                {/* Username (account credentials) */}
                {details.generated_username && (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                    <AtSign size={16} className="text-slate-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-600 uppercase">Login Username</p>
                      <p className="text-sm text-slate-300 font-mono">{details.generated_username}</p>
                    </div>
                  </div>
                )}

                {/* Fixed Route */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <MapPin size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Fixed Assigned Route</p>
                    <p className="text-sm text-slate-300">{details.assigned_route}</p>
                  </div>
                </div>

                {/* Employment Status */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <User size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Employment Status</p>
                    <p className="text-sm text-emerald-400">Active</p>
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

                {/* Current Driver Partner */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <Users size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Current Driver Partner</p>
                    {details.driver_partner ? (
                      <p className="text-sm text-slate-300">{details.driver_partner.name}</p>
                    ) : (
                      <p className="text-sm text-slate-500 italic">None</p>
                    )}
                  </div>
                </div>

                {/* Route Assignment */}
                <div className="flex items-center gap-3 p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                  <MapPin size={16} className="text-slate-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-600 uppercase">Route Assignment</p>
                    <p className="text-sm text-slate-300">{details.vehicle?.route ?? details.assigned_route}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ RIGHT COLUMN: Assignment History ═══════ */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2.5 flex items-center gap-2">
              <Clock size={13} />
              Assignment History
              <span className="text-[10px] text-slate-600 font-normal normal-case tracking-normal">
                ({details.shift_logs.length} shifts)
              </span>
            </h3>
            {details.shift_logs.length === 0 ? (
              <div className="text-center py-10">
                <FileText size={32} className="text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-600 italic">No shift history yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {details.shift_logs.map((log) => (
                  <div key={log.shift_id} className="p-3 rounded-md bg-[#0E1628] border border-[#1E2D45]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-amber-400">
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
                        <span className="text-slate-600">Driver:</span>{' '}
                        <span className="text-slate-400">{log.driver_name || '—'}</span>
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
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
