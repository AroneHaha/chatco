// app/(admin)/vehicles/data/vehicles-data.ts

import { useState, useEffect, useCallback } from 'react';

export interface Personnel {
  id: string;
  name: string;
  role: 'Driver' | 'Conductor';
  contact: string;
  profilePic: string;
}

export interface Vehicle {
  id: string;
  unitNumber: string;
  plateNumber: string;
  routeId: string;
  route: string;
  driver: string | null;
  conductor: string | null;
  status: 'Operating' | 'Under Maintenance' | 'Out of Service / Damaged';
  speed: number;
}

export interface TerminatedPersonnel {
  id: string;
  name: string;
  role: string;
  contact: string;
  status: 'Terminated' | 'Resigned';
  reason: string;
  terminatedDate: string;
  dateJoined: string;
}

export interface ShiftLog {
  id: string;
  personnelName: string;
  role: string;
  vehicle: string;
  shiftDate: string;
  timeIn: string;
  timeOut: string;
  status: string;
  notes: string;
  details: string;
}

export interface DriverRating {
  id: string;
  date: string;
  commuterName: string;
  plateNumber: string;
  route: string;
  rating: number;
  comment: string;
}

export interface DriverProfile extends Personnel {
  hireDate: string;
  licenseNumber: string;
  licenseExpiry: string;
  totalTrips: number;
  assignedVehicle: string | null;
  assignedRoute: string | null;
}

export interface VehiclesData {
  personnel: Personnel[];
  vehicles: Vehicle[];
  terminatedPersonnel: TerminatedPersonnel[];
  shiftHistoryLog: ShiftLog[];
  driverProfiles: Record<string, DriverProfile>;
  driverRatings: Record<string, DriverRating[]>;
}

export interface PageMeta {
  currentPage: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  perPage: number;
}

export interface FleetCounts {
  vehicles: number;
  personnel: number;
  terminatedPersonnel: number;
  shiftHistoryLog: number;
}

export type FleetTab = 'vehicles' | 'personnel' | 'history';
export type FleetHistoryTab = 'terminated' | 'shifts';
export type PersonnelRoleFilter = 'all' | 'driver' | 'conductor';
export type FleetShiftHistoryRange = 'today' | 'last_7_days' | 'this_month' | 'all_time';

export interface VehiclesQueryState {
  activeTab: FleetTab;
  historyTab: FleetHistoryTab;
  searchQuery: string;
  personnelRole: PersonnelRoleFilter;
  shiftHistoryRange: FleetShiftHistoryRange;
  vehiclePage: number;
  personnelPage: number;
  terminatedPage: number;
  shiftPage: number;
}

const PAGE_SIZE = 25;
const VEHICLES_POLL_INTERVAL_MS = 30_000;

const EMPTY_PAGE_META: PageMeta = {
  currentPage: 1,
  totalPages: 1,
  from: 0,
  to: 0,
  total: 0,
  perPage: PAGE_SIZE,
};

const EMPTY_DATA: VehiclesData = {
  personnel: [],
  vehicles: [],
  terminatedPersonnel: [],
  shiftHistoryLog: [],
  driverProfiles: {},
  driverRatings: {},
};

function pageMetaFrom(raw: Record<string, unknown> | undefined | null): PageMeta {
  if (!raw) return EMPTY_PAGE_META;

  const total = Number(raw.total ?? 0);
  const perPage = Number(raw.per_page ?? PAGE_SIZE);
  const currentPage = Number(raw.current_page ?? 1);

  return {
    currentPage,
    totalPages: Math.max(1, Number((raw.last_page ?? Math.ceil(total / perPage)) || 1)),
    from: Number(raw.from ?? 0),
    to: Number(raw.to ?? 0),
    total,
    perPage,
  };
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
  }

  return res.json();
}

function paginatedRows(json: unknown): Record<string, unknown>[] {
  const envelope = json as { data?: unknown };
  const paginator = envelope.data as { data?: unknown } | undefined;
  return Array.isArray(paginator?.data) ? (paginator.data as Record<string, unknown>[]) : [];
}

function paginatedMeta(json: unknown): PageMeta {
  const envelope = json as { data?: Record<string, unknown> };
  return pageMetaFrom(envelope.data);
}

function buildPagedUrl(
  path: string,
  page: number,
  searchQuery: string,
  extra?: Record<string, string>,
  perPage = PAGE_SIZE,
): string {
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    ...extra,
  });
  const query = searchQuery.trim();
  if (query) params.set('search', query);
  return `${path}?${params.toString()}`;
}

function buildCountUrl(
  path: string,
  searchQuery: string,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams({
    count_only: '1',
    ...extra,
  });
  const query = searchQuery.trim();
  if (query) params.set('search', query);
  return `${path}?${params.toString()}`;
}

function mapVehicles(apiVehicles: Record<string, unknown>[]): Vehicle[] {
  return apiVehicles.map((v) => {
    const status = String(v.status ?? 'ACTIVE');
    let vehicleStatus: Vehicle['status'] = 'Operating';
    if (status === 'MAINTENANCE') vehicleStatus = 'Under Maintenance';
    else if (status === 'INACTIVE') vehicleStatus = 'Out of Service / Damaged';

    const driver = v.driver as Record<string, unknown> | null;
    const conductor = v.conductor as Record<string, unknown> | null;
    const route = v.route as Record<string, unknown> | null;

    return {
      id: String(v.id ?? ''),
      unitNumber: String(v.unit_number ?? '-'),
      plateNumber: String(v.plate_number ?? '-'),
      routeId: route?.id ? String(route.id) : '',
      route: route?.name ? String(route.name) : '-',
      driver: driver ? `${driver.first_name ?? ''} ${driver.last_name ?? ''}`.trim() : null,
      conductor: conductor ? `${conductor.first_name ?? ''} ${conductor.last_name ?? ''}`.trim() : null,
      status: vehicleStatus,
      speed: Number(v.speed ?? 0),
    };
  });
}

function mapPersonnel(apiPersonnel: Record<string, unknown>[]): Personnel[] {
  return apiPersonnel.map((p) => {
    const role: Personnel['role'] = p.role === 'Conductor' ? 'Conductor' : 'Driver';
    const name = String(p.name ?? '').trim() || 'Unknown';

    return {
      id: String(p.id ?? ''),
      name,
      role,
      contact: String(p.contact ?? '-'),
      profilePic: p.profile_picture_url
        ? String(p.profile_picture_url)
        : `https://placehold.co/150x150/0A1E33/${role === 'Driver' ? '62A0EA' : 'F59E0B'}?text=${name[0] ?? role[0]}`,
    };
  });
}

function mapTerminatedPersonnel(apiTerminated: Record<string, unknown>[]): TerminatedPersonnel[] {
  return apiTerminated.map((t) => ({
    id: String(t.id ?? ''),
    name: String(t.name ?? 'Unknown'),
    role: String(t.role ?? '-'),
    contact: String(t.contact ?? '-'),
    status: (t.termination_type === 'RESIGNED' ? 'Resigned' : 'Terminated') as TerminatedPersonnel['status'],
    reason: String(t.reason ?? '-'),
    terminatedDate: String(t.terminated_date ?? ''),
    dateJoined: String(t.date_joined ?? ''),
  }));
}

function mapShiftHistory(apiShiftEntries: Record<string, unknown>[]): ShiftLog[] {
  return apiShiftEntries.map((entry) => ({
    id: String(entry.id ?? ''),
    personnelName: String(entry.personnelName ?? entry.personnel_name ?? '-'),
    role: String(entry.role ?? '-'),
    vehicle: String(entry.vehicle ?? '-'),
    shiftDate: String(entry.shiftDate ?? entry.shift_date ?? '-'),
    timeIn: String(entry.timeIn ?? entry.time_in ?? '-'),
    timeOut: String(entry.timeOut ?? entry.time_out ?? '-'),
    status: String(entry.status ?? '-'),
    notes: String(entry.notes ?? ''),
    details: String(entry.details ?? '-'),
  }));
}

async function fetchCount(url: string, signal?: AbortSignal): Promise<number> {
  const json = await fetchJson(url, signal);
  const envelope = json as { data?: { total?: unknown } };
  if (envelope.data?.total !== undefined) return Number(envelope.data.total);
  return paginatedMeta(json).total;
}

async function fetchVehiclesData(
  query: VehiclesQueryState,
  signal?: AbortSignal,
): Promise<{
  data: VehiclesData;
  counts: FleetCounts;
  pages: {
    vehicles: PageMeta;
    personnel: PageMeta;
    terminatedPersonnel: PageMeta;
    shiftHistoryLog: PageMeta;
  };
}> {
  const personnelExtra = query.personnelRole === 'all'
    ? undefined
    : { role: query.personnelRole };
  const shiftExtra = {
    entry_view: 'personnel',
    ...(query.shiftHistoryRange === 'all_time' ? {} : { shift_range: query.shiftHistoryRange }),
  };

  const urls = {
    vehicles: buildPagedUrl('/api/admin/vehicles', query.vehiclePage, query.searchQuery),
    personnel: buildPagedUrl('/api/admin/personnel', query.personnelPage, query.searchQuery, personnelExtra),
    terminatedPersonnel: buildPagedUrl('/api/admin/terminated-personnel', query.terminatedPage, query.searchQuery),
    shiftHistoryLog: buildPagedUrl('/api/admin/shift-logs', query.shiftPage, query.searchQuery, shiftExtra),
  };

  const activeKey = query.activeTab === 'history'
    ? query.historyTab === 'terminated'
      ? 'terminatedPersonnel'
      : 'shiftHistoryLog'
    : query.activeTab;

  const [activeJson, vehicleCount, personnelCount, terminatedCount, shiftCount] = await Promise.all([
    fetchJson(urls[activeKey], signal),
    activeKey === 'vehicles' ? Promise.resolve(null) : fetchCount(buildCountUrl('/api/admin/vehicles', query.searchQuery), signal),
    activeKey === 'personnel' ? Promise.resolve(null) : fetchCount(buildCountUrl('/api/admin/personnel', query.searchQuery, personnelExtra), signal),
    activeKey === 'terminatedPersonnel' ? Promise.resolve(null) : fetchCount(buildCountUrl('/api/admin/terminated-personnel', query.searchQuery), signal),
    activeKey === 'shiftHistoryLog'
      ? Promise.resolve(null)
      : fetchCount(buildCountUrl('/api/admin/shift-logs', query.searchQuery, shiftExtra), signal),
  ]);

  const activeRows = paginatedRows(activeJson);
  const activeMeta = paginatedMeta(activeJson);

  const data: VehiclesData = { ...EMPTY_DATA };
  if (activeKey === 'vehicles') data.vehicles = mapVehicles(activeRows);
  if (activeKey === 'personnel') data.personnel = mapPersonnel(activeRows);
  if (activeKey === 'terminatedPersonnel') data.terminatedPersonnel = mapTerminatedPersonnel(activeRows);
  if (activeKey === 'shiftHistoryLog') data.shiftHistoryLog = mapShiftHistory(activeRows);

  const pages = {
    vehicles: activeKey === 'vehicles' ? activeMeta : EMPTY_PAGE_META,
    personnel: activeKey === 'personnel' ? activeMeta : EMPTY_PAGE_META,
    terminatedPersonnel: activeKey === 'terminatedPersonnel' ? activeMeta : EMPTY_PAGE_META,
    shiftHistoryLog: activeKey === 'shiftHistoryLog' ? activeMeta : EMPTY_PAGE_META,
  };

  const counts = {
    vehicles: activeKey === 'vehicles' ? activeMeta.total : Number(vehicleCount ?? 0),
    personnel: activeKey === 'personnel' ? activeMeta.total : Number(personnelCount ?? 0),
    terminatedPersonnel: activeKey === 'terminatedPersonnel' ? activeMeta.total : Number(terminatedCount ?? 0),
    shiftHistoryLog: activeKey === 'shiftHistoryLog' ? activeMeta.total : Number(shiftCount ?? 0),
  };

  return { data, counts, pages };
}

export function useVehiclesData(query: VehiclesQueryState) {
  const [data, setData] = useState<VehiclesData>(EMPTY_DATA);
  const [counts, setCounts] = useState<FleetCounts>({
    vehicles: 0,
    personnel: 0,
    terminatedPersonnel: 0,
    shiftHistoryLog: 0,
  });
  const [pages, setPages] = useState({
    vehicles: EMPTY_PAGE_META,
    personnel: EMPTY_PAGE_META,
    terminatedPersonnel: EMPTY_PAGE_META,
    shiftHistoryLog: EMPTY_PAGE_META,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false, signal?: AbortSignal) => {
    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const result = await fetchVehiclesData(query, signal);
      setData((current) => ({ ...current, ...result.data }));
      setCounts(result.counts);
      setPages((current) => ({ ...current, ...result.pages }));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load vehicles data');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [query]);

  const refetch = useCallback(() => load(false), [load]);

  useEffect(() => {
    const controller = new AbortController();
    load(false, controller.signal);

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, VEHICLES_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    const onFocusOrOnline = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocusOrOnline);
    window.addEventListener('online', onFocusOrOnline);

    return () => {
      controller.abort();
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocusOrOnline);
      window.removeEventListener('online', onFocusOrOnline);
    };
  }, [load]);

  return { data, counts, pages, isLoading, error, refetch, setData };
}
