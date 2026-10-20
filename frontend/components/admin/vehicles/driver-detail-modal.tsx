// components/admin/vehicles/driver-detail-modal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { PageTabs, type PageTab } from '@/components/admin/ui/page-tabs';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import { History, User, X, ZoomIn } from 'lucide-react';
import type { Personnel } from '@/app/(admin)/vehicles/data/vehicles-data';
import {
  PersonnelHeader,
  DetailSection,
  DetailRow,
  DetailColumns,
  DetailTabPanels,
  DetailSkeleton,
  ShiftLedger,
  calculateAge,
  formatDate,
} from '@/components/admin/vehicles/personnel-detail-parts';

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
  license_front_image_url: string | null;
  license_back_image_url: string | null;
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

type DetailTab = 'info' | 'history';

interface DriverDetailModalProps {
  driver: Personnel | null;
  onClose: () => void;
}

export function DriverDetailModal({ driver, onClose }: DriverDetailModalProps) {
  const [details, setDetails] = useState<DriverDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('info');
  const [expandedLicenseSide, setExpandedLicenseSide] = useState<'front' | 'back' | null>(null);

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
      setExpandedLicenseSide(null);
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

  // A stale record from the previously opened driver must not show under
  // this driver's name while the new one loads.
  const record = details?.id === driver.id ? details : null;

  const fullName = record
    ? `${record.first_name} ${record.middle_name ? record.middle_name + ' ' : ''}${record.last_name}`.trim()
    : driver.name;

  const tabs: PageTab<DetailTab>[] = [
    { id: 'info', label: 'Personal Info', icon: User },
    { id: 'history', label: 'Assignment History', icon: History, count: shiftLogsTotal ?? undefined },
  ];

  return (
    <Modal adminThemed isOpen={!!driver} onClose={onClose} maxWidth="max-w-4xl">
      <PersonnelHeader
        role="Driver"
        id={driver.id}
        name={fullName}
        photoUrl={record?.profile_picture_url ?? null}
        status={record?.status ?? null}
        vehicle={record?.vehicle ?? null}
        partnerName={record?.conductor_partner?.name ?? null}
        isLoaded={!!record}
      />

      {error && (
        <div className="mt-5 rounded-md border border-red-500/20 bg-red-500/10 p-3">
          <p className="text-sm text-red-400 admin-light:text-red-600">{error}</p>
        </div>
      )}

      <PageTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} className="mt-6 mb-5" />

      {isLoading && !record ? (
        <DetailSkeleton />
      ) : record ? (
        <DetailTabPanels
          showHistory={activeTab === 'history'}
          info={
            <DetailColumns
              left={
                <DetailSection title="Personal">
                  <DetailRow label="License no." mono>{record.license_number || '—'}</DetailRow>
                  <DetailRow label="Birth date" hint={record.birthday ? calculateAge(record.birthday) : undefined}>
                    {formatDate(record.birthday)}
                  </DetailRow>
                  <DetailRow label="Contact">{record.contact || '—'}</DetailRow>
                  <DetailRow label="Address">{record.address || '—'}</DetailRow>
                  <DetailRow label="Date hired">{formatDate(record.hire_date)}</DetailRow>
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

                  <section>
                    <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">License</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ['front', 'Front', record.license_front_image_url],
                        ['back', 'Back', record.license_back_image_url],
                      ] as const).map(([side, label, storedPath]) => (
                        <figure key={side} className="min-w-0">
                          {storedPath ? (
                            // Click to view full size; the thumbnail is too
                            // small to read the license details from.
                            <button
                              type="button"
                              onClick={() => setExpandedLicenseSide(side)}
                              className="group relative flex aspect-[1.6] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F8FAFC]"
                              aria-label={`View full-size ${label.toLowerCase()} of driver's license`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/api/admin/drivers/${record.id}/license-images/${side}`} alt={`${label} of driver's license`} className="h-full w-full object-contain" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                                <ZoomIn size={20} aria-hidden="true" className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                              </div>
                            </button>
                          ) : (
                            <div className="flex aspect-[1.6] items-center justify-center overflow-hidden rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F8FAFC]">
                              <span className="text-xs text-slate-500">Not uploaded</span>
                            </div>
                          )}
                          <figcaption className="mt-1.5 text-xs text-slate-500">{label}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </section>
                </>
              }
            />
          }
          history={
            <>
              <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {historyDate ? `Showing assignments for ${formatDate(historyDate)}` : 'Showing all assignments'}
                </p>
                <AdminDatePicker
                  popover
                  yearNavigation
                  value={historyDate}
                  onChange={setHistoryDate}
                  accent="blue"
                  align="right"
                  ariaLabel="Filter assignment history by date"
                />
              </div>

              {shiftLogsError && (
                <div className="mb-3 shrink-0 rounded-md border border-red-500/20 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400 admin-light:text-red-600">{shiftLogsError}</p>
                </div>
              )}

              <ShiftLedger
                entries={shiftLogs}
                middleLabel="Route"
                middleValue={(log) => log.route}
                isFirstPageLoading={shiftLogsPage === 0 && isShiftLogsLoading}
                isLoadingMore={isShiftLogsLoading}
                hasMore={shiftLogsHasMore}
                emptyMessage={historyDate ? `No assignments on ${formatDate(historyDate)}.` : 'No shift history yet.'}
                listRef={shiftLogsListRef}
                sentinelRef={shiftLogsSentinelRef}
              />
            </>
          }
        />
      ) : null}

      {/* Full-size license image lightbox — sits above the modal (z-60 vs
          the modal's z-50) so it isn't clipped by the panel's own scroll area. */}
      {record && expandedLicenseSide && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setExpandedLicenseSide(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedLicenseSide(null)}
            className="absolute top-4 right-4 p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close full-size image"
          >
            <X size={24} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/drivers/${record.id}/license-images/${expandedLicenseSide}`}
            alt={`${expandedLicenseSide === 'front' ? 'Front' : 'Back'} of driver's license (full size)`}
            className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Modal>
  );
}
