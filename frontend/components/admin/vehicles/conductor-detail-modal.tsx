// components/admin/vehicles/conductor-detail-modal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { PageTabs, type PageTab } from '@/components/admin/ui/page-tabs';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import { ConfirmPasswordModal } from '@/components/admin/ui/confirm-password-modal';
import { History, KeyRound, Ban, User } from 'lucide-react';
import type { Personnel } from '@/app/(admin)/vehicles/data/vehicles-data';
import {
  PersonnelHeader,
  DetailSection,
  DetailRow,
  DetailColumns,
  DetailSkeleton,
  ShiftLedger,
  calculateAge,
  formatDate,
} from '@/components/admin/vehicles/personnel-detail-parts';

interface ConductorDetail {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  birthday: string | null;
  contact: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_relationship: string | null;
  profile_picture_url: string | null;
  generated_username: string | null;
  /** ACTIVE, or DISABLED after "Disable Account" (cleared by a reset). */
  status: string;
  vehicle: {
    id: string;
    unit_number: string;
    plate_number: string;
    route: string | null;
  } | null;
  driver_partner: { id: string; name: string } | null;
  assigned_route: string;
}

interface ShiftLogEntry {
  shift_id: string;
  unit_number: string | null;
  plate_number: string | null;
  route: string | null;
  driver_name: string | null;
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

interface ConductorDetailModalProps {
  conductor: Personnel | null;
  onClose: () => void;
  /** Fired after Reset Credentials / Disable Account succeeds so the
   *  Personnel list can refresh the conductor's status. */
  onChanged?: () => void;
}

/**
 * The backend puts the specific reason for a refusal ("The password you
 * entered is incorrect.", the active-shift conflict) in `errors`, under a
 * generic top-level message such as "Validation failed" or "Conflict".
 */
function responseErrorMessage(data: { message?: string; errors?: Record<string, string[]> } | null, fallback: string): string {
  const first = data?.errors ? Object.values(data.errors).flat().find(Boolean) : undefined;
  return first ?? data?.message ?? fallback;
}

type DetailTab = 'info' | 'history';

export function ConductorDetailModal({ conductor, onClose, onChanged }: ConductorDetailModalProps) {
  const [details, setDetails] = useState<ConductorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which destructive action is currently awaiting password confirmation —
  // null means neither confirm dialog is open. The actual reset/disable
  // request only fires after the admin re-enters their password.
  const [confirmAction, setConfirmAction] = useState<'reset' | 'disable' | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');

  const [shiftLogs, setShiftLogs] = useState<ShiftLogEntry[]>([]);
  const [shiftLogsPage, setShiftLogsPage] = useState(0);
  const [shiftLogsTotal, setShiftLogsTotal] = useState<number | null>(null);
  const [shiftLogsHasMore, setShiftLogsHasMore] = useState(true);
  const [isShiftLogsLoading, setIsShiftLogsLoading] = useState(false);
  const [shiftLogsError, setShiftLogsError] = useState<string | null>(null);
  const [historyDate, setHistoryDate] = useState('');
  const shiftLogsListRef = useRef<HTMLDivElement>(null);
  const shiftLogsSentinelRef = useRef<HTMLDivElement>(null);
  // Tracks which conductor+date combo the history list currently holds, so
  // switching tabs back and forth doesn't trigger a refetch — only a real
  // conductor change or a new date filter does.
  const shiftLogsQueryKeyRef = useRef<string | null>(null);

  // Called by ConfirmPasswordModal only after the admin re-enters their
  // password — the password itself is verified server-side (Hash::check
  // against the calling admin's own account) before anything happens.
  // Throwing here keeps the confirm modal open with the error shown inline
  // (wrong password, or e.g. a 409 active-shift conflict).
  const handleResetCredentials = async (password: string) => {
    if (!conductor) return;
    setActionResult(null);
    const res = await fetch(`/api/admin/conductors/${conductor.id}/reset-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ current_password: password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(responseErrorMessage(data, 'Failed to reset credentials.'));
    }
    const d = data.data;
    setActionResult(
      `${data.message ?? 'Credentials reset successfully. The conductor must log in with the new credentials.'} New credentials — Username: ${d.generated_username} | Password: ${d.generated_password}`
    );
    setDetails(prev => (prev ? { ...prev, status: 'ACTIVE', generated_username: d.generated_username } : prev));
    onChanged?.();
  };

  const handleDisableAccount = async (password: string) => {
    if (!conductor) return;
    setActionResult(null);
    const res = await fetch(`/api/admin/conductors/${conductor.id}/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ current_password: password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(responseErrorMessage(data, 'Failed to disable account.'));
    }
    setActionResult(
      `${data?.message ?? 'Conductor account disabled. All sessions revoked.'} The conductor cannot log in until credentials are reset.`
    );
    setDetails(prev => (prev ? { ...prev, status: 'DISABLED' } : prev));
    onChanged?.();
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

  // Fetches one page of shift history (10 at a time, newest first),
  // optionally scoped to a single calendar day. Page 1 replaces the list
  // (fresh load); later pages append (infinite scroll).
  const fetchShiftLogs = async (page: number, date: string) => {
    if (!conductor || isShiftLogsLoading) return;
    setIsShiftLogsLoading(true);
    setShiftLogsError(null);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(SHIFT_LOGS_PER_PAGE) });
      if (date) params.set('date', date);
      const res = await fetch(
        `/api/admin/conductors/${conductor.id}/shift-logs?${params.toString()}`,
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
    if (conductor) {
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
  }, [conductor?.id]);

  // Lazy-loads (or reloads, if the date filter changed) the first page only
  // once the History tab is actually opened — never fetched alongside
  // Personal Info, and never re-fetched just from switching tabs back and
  // forth with the same date filter still applied.
  useEffect(() => {
    if (activeTab !== 'history' || !conductor) return;
    const key = `${conductor.id}|${historyDate}`;
    if (shiftLogsQueryKeyRef.current === key) return;
    shiftLogsQueryKeyRef.current = key;
    setShiftLogs([]);
    setShiftLogsPage(0);
    setShiftLogsTotal(null);
    setShiftLogsHasMore(true);
    setShiftLogsError(null);
    fetchShiftLogs(1, historyDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, historyDate, conductor?.id]);

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


  if (!conductor) return null;

  // A stale record from the previously opened conductor must not show under
  // this conductor's name while the new one loads.
  const record = details?.id === conductor.id ? details : null;

  const fullName = record
    ? `${record.first_name} ${record.middle_name ? record.middle_name + ' ' : ''}${record.last_name}`.trim()
    : conductor.name;

  const tabs: PageTab<DetailTab>[] = [
    { id: 'info', label: 'Personal Info', icon: User, accent: 'amber' },
    { id: 'history', label: 'Assignment History', icon: History, accent: 'amber', count: shiftLogsTotal ?? undefined },
  ];

  return (
    <>
      <Modal adminThemed isOpen={!!conductor} onClose={onClose} maxWidth="max-w-4xl" height="h-[min(680px,85vh)]">
        <PersonnelHeader
          role="Conductor"
          id={conductor.id}
          name={fullName}
          photoUrl={record?.profile_picture_url ?? null}
          status={record?.status ?? null}
          vehicle={record?.vehicle ?? null}
          partnerName={record?.driver_partner?.name ?? null}
          isLoaded={!!record}
        />

        {/* Result of Reset Credentials / Disable Account. Above the tabs so
            the new credentials stay readable whichever tab is open. */}
        {actionResult && (
          <div className="mt-5 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="break-all font-mono text-xs text-emerald-400 admin-light:text-emerald-700">{actionResult}</p>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-md border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-sm text-red-400 admin-light:text-red-600">{error}</p>
          </div>
        )}

        <PageTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} className="mt-6 mb-5" />

        {isLoading && !record ? (
          <DetailSkeleton />
        ) : record && activeTab === 'info' ? (
          <div role="tabpanel">
            <DetailColumns
              left={
                <DetailSection title="Personal">
                  <DetailRow label="Birth date" hint={record.birthday ? calculateAge(record.birthday) : undefined}>
                    {formatDate(record.birthday)}
                  </DetailRow>
                  <DetailRow label="Contact">{record.contact || '—'}</DetailRow>
                  <DetailRow label="Address">{record.address || '—'}</DetailRow>
                  <DetailRow label="Fixed route">{record.assigned_route}</DetailRow>
                </DetailSection>
              }
              right={
                <>
                  <DetailSection title="Emergency contact">
                    <DetailRow label="Name">{record.emergency_contact_name || '—'}</DetailRow>
                    <DetailRow label="Relationship">{record.emergency_contact_relationship || '—'}</DetailRow>
                    <DetailRow label="Number">{record.emergency_contact_number || '—'}</DetailRow>
                  </DetailSection>

                  {/* Account: the login and the two admin actions on it. Each
                      action opens a password confirmation first (see
                      ConfirmPasswordModal below), so a stray click can't
                      change the account. */}
                  <section>
                    <DetailSection title="Account">
                      <DetailRow label="Login username" mono>{record.generated_username || '—'}</DetailRow>
                    </DetailSection>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmAction('reset')}
                        className="flex items-center gap-1.5 rounded-md border border-[#2A3A55] admin-light:border-[#E2E8F0] px-3 py-2 text-xs font-semibold text-slate-200 admin-light:text-slate-700 transition-colors hover:bg-white/5 admin-light:hover:bg-[#F1F5F9]"
                      >
                        <KeyRound size={14} aria-hidden="true" className="text-slate-400 admin-light:text-slate-500" />
                        Reset credentials
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction('disable')}
                        className="flex items-center gap-1.5 rounded-md border border-red-500/25 px-3 py-2 text-xs font-semibold text-red-400 admin-light:text-red-600 transition-colors hover:bg-red-500/10 admin-light:hover:bg-red-50"
                      >
                        <Ban size={14} aria-hidden="true" />
                        Disable account
                      </button>
                    </div>
                  </section>
                </>
              }
            />
          </div>
        ) : record && activeTab === 'history' ? (
          <div role="tabpanel">
            <div className="mb-3 flex items-center justify-between gap-3">
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
              <div className="mb-3 rounded-md border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-sm text-red-400 admin-light:text-red-600">{shiftLogsError}</p>
              </div>
            )}

            <ShiftLedger
              entries={shiftLogs}
              middleLabel="Driver"
              middleValue={(log) => log.driver_name}
              isFirstPageLoading={shiftLogsPage === 0 && isShiftLogsLoading}
              isLoadingMore={isShiftLogsLoading}
              hasMore={shiftLogsHasMore}
              emptyMessage={historyDate ? `No assignments on ${formatDate(historyDate)}.` : 'No shift history yet.'}
              listRef={shiftLogsListRef}
              sentinelRef={shiftLogsSentinelRef}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmPasswordModal
        isOpen={confirmAction === 'reset'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleResetCredentials}
        title="Reset Conductor Credentials"
        description={`Generate new login credentials for ${conductor.name}.`}
        confirmLabel="Reset Credentials"
        variant="default"
      />
      <ConfirmPasswordModal
        isOpen={confirmAction === 'disable'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleDisableAccount}
        title="Disable Conductor Account"
        description={`This revokes all active sessions for ${conductor.name} immediately.`}
        confirmLabel="Disable Account"
        variant="danger"
      />
    </>
  );
}
