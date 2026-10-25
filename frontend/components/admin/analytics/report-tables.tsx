"use client";

// components/admin/analytics/report-tables.tsx
// The Detailed Reports tab: one report on screen at a time. Each report is a
// spec (columns + raw rows) so the table and every export format read the
// same rows; the remittance and pickup reports keep their own components and
// only use their spec for export.

import { DataTable } from "@/components/admin/ui/data-table";
import {
  formatNumber,
  formatPeso,
  type AnalyticsData,
} from "@/lib/admin/services/analytics.service";

export type ReportId = "remittance" | "daily" | "units" | "conductors" | "pickups" | "gcash";

export const REPORTS: { id: ReportId; label: string }[] = [
  { id: "remittance", label: "Shift Remittance" },
  { id: "daily", label: "Daily Sales" },
  { id: "units", label: "Units" },
  { id: "conductors", label: "Conductors" },
  { id: "pickups", label: "Pickup Points" },
  { id: "gcash", label: "GCash Payments" },
];

export function isReportId(value: string | null): value is ReportId {
  return REPORTS.some((report) => report.id === value);
}

type CellKind = "text" | "date" | "peso" | "count" | "percent";
type Cell = string | number | null;

export interface ReportSpec {
  title: string;
  description: string;
  columns: { label: string; kind: CellKind }[];
  rows: Cell[][];
  /** One value per column, shown above the table and appended to exports.
   * Text columns are left empty. */
  totals?: Cell[];
  emptyMessage: string;
}

/** Rows as exported: the table rows, then the totals row labelled "Total". */
export function exportRows(spec: ReportSpec): Cell[][] {
  if (!spec.totals || spec.rows.length === 0) return spec.rows;
  return [...spec.rows, spec.totals.map((value, i) => (i === 0 ? "Total" : value))];
}

/** Remittance record as /api/admin/remittances returns it (decimals coerced). */
export interface RemittanceRow {
  shift_id: string;
  conductor_name: string;
  driver_name: string;
  unit_number: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  cash_total: number;
  gcash_total: number;
  /** Cash the admin counted; 0 until the remittance is declared. */
  remitted_amount: number;
  shortage: number;
  overage: number;
  total_passengers: number;
  remittance_status: string;
}

export const REMITTANCE_STATUS_LABEL: Record<string, string> = {
  COMPLETE: "Complete",
  SHORTAGE: "Shortage",
  OVERAGE: "Overage",
  PENDING: "Awaiting",
};

/** "2026-10-24" -> "Fri, Oct 24", parsed from parts so Manila never shifts a day. */
function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
}

/** screen: what the table shows; csv: plain numbers; doc: PDF/Excel/Word. */
export function formatCell(kind: CellKind, value: Cell, mode: "screen" | "csv" | "doc"): string {
  if (value === null) return mode === "screen" ? "—" : "";
  if (typeof value === "string") return kind === "date" && mode === "screen" ? formatDay(value) : value;

  switch (kind) {
    case "peso":
      if (mode === "csv") return value.toFixed(2);
      return mode === "screen" ? formatPeso(value) : value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "percent":
      return mode === "csv" ? value.toFixed(1) : `${value.toFixed(1)}%`;
    case "count":
      return mode === "csv" ? String(value) : formatNumber(value);
    default:
      return String(value);
  }
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const avgPerShift = (revenue: number, shifts: number) => (shifts > 0 ? revenue / shifts : null);

export function buildRemittanceReport(rows: RemittanceRow[]): ReportSpec {
  return {
    title: "Shift Remittance",
    description: "Each ended shift's fares and the cash the admin counted.",
    columns: [
      { label: "Shift ID", kind: "text" },
      { label: "Conductor", kind: "text" },
      { label: "Driver", kind: "text" },
      { label: "Unit", kind: "text" },
      { label: "Date", kind: "date" },
      { label: "Time In", kind: "text" },
      { label: "Time Out", kind: "text" },
      { label: "Passengers", kind: "count" },
      { label: "Cash", kind: "peso" },
      { label: "GCash", kind: "peso" },
      { label: "Cash Remitted", kind: "peso" },
      { label: "Shortage", kind: "peso" },
      { label: "Overage", kind: "peso" },
      { label: "Status", kind: "text" },
    ],
    rows: rows.map((row) => {
      const declared = row.remittance_status !== "PENDING";
      return [
        row.shift_id,
        row.conductor_name ?? "",
        row.driver_name ?? "",
        row.unit_number ?? "",
        row.date ?? "",
        row.time_in ?? "",
        row.time_out ?? "",
        row.total_passengers,
        row.cash_total,
        row.gcash_total,
        declared ? row.remitted_amount : null,
        declared ? row.shortage : null,
        declared ? row.overage : null,
        REMITTANCE_STATUS_LABEL[row.remittance_status] ?? row.remittance_status,
      ];
    }),
    emptyMessage: "No ended shifts in this date range.",
  };
}

export function buildDailyReport(data: AnalyticsData): ReportSpec {
  const days = [...data.daily_series].reverse();
  return {
    title: "Daily Sales",
    description: "Paid fares per day, newest first. Voucher rides carry no fare.",
    columns: [
      { label: "Date", kind: "date" },
      { label: "Paid Rides", kind: "count" },
      { label: "Voucher Rides", kind: "count" },
      { label: "Cash", kind: "peso" },
      { label: "GCash", kind: "peso" },
      { label: "Total", kind: "peso" },
    ],
    rows: days.map((day) => [day.date, day.paid_count, day.count - day.paid_count, day.cash, day.gcash, day.total]),
    totals: [
      null,
      sum(days.map((day) => day.paid_count)),
      sum(days.map((day) => day.count - day.paid_count)),
      sum(days.map((day) => day.cash)),
      sum(days.map((day) => day.gcash)),
      sum(days.map((day) => day.total)),
    ],
    emptyMessage: "No days in this date range.",
  };
}

export function buildUnitsReport(data: AnalyticsData): ReportSpec {
  const units = data.performance.units;
  return {
    title: "Units",
    description: "Fare revenue per unit, highest first.",
    columns: [
      { label: "Unit", kind: "text" },
      { label: "Plate", kind: "text" },
      { label: "Shifts", kind: "count" },
      { label: "Passengers", kind: "count" },
      { label: "Revenue", kind: "peso" },
      { label: "Avg per Shift", kind: "peso" },
    ],
    rows: units.map((unit) => [unit.unit_number, unit.plate_number, unit.shifts, unit.passengers, unit.revenue, avgPerShift(unit.revenue, unit.shifts)]),
    totals: [
      null, null,
      sum(units.map((unit) => unit.shifts)),
      sum(units.map((unit) => unit.passengers)),
      sum(units.map((unit) => unit.revenue)),
      avgPerShift(sum(units.map((unit) => unit.revenue)), sum(units.map((unit) => unit.shifts))),
    ],
    emptyMessage: "No shifts in this date range.",
  };
}

export function buildConductorsReport(data: AnalyticsData): ReportSpec {
  const conductors = data.performance.conductors;
  return {
    title: "Conductors",
    description: "Fare revenue per conductor, highest first.",
    columns: [
      { label: "Conductor", kind: "text" },
      { label: "Shifts", kind: "count" },
      { label: "Passengers", kind: "count" },
      { label: "Revenue", kind: "peso" },
      { label: "Avg per Shift", kind: "peso" },
    ],
    rows: conductors.map((conductor) => [conductor.name, conductor.shifts, conductor.passengers, conductor.revenue, avgPerShift(conductor.revenue, conductor.shifts)]),
    totals: [
      null,
      sum(conductors.map((conductor) => conductor.shifts)),
      sum(conductors.map((conductor) => conductor.passengers)),
      sum(conductors.map((conductor) => conductor.revenue)),
      avgPerShift(sum(conductors.map((conductor) => conductor.revenue)), sum(conductors.map((conductor) => conductor.shifts))),
    ],
    emptyMessage: "No shifts in this date range.",
  };
}

export function buildPickupsReport(data: AnalyticsData): ReportSpec {
  const zones = data.heatmap_zones;
  const total = sum(zones.map((zone) => zone.commuters));
  return {
    title: "Pickup Points",
    description: "Paid boardings by fare point, busiest first.",
    columns: [
      { label: "#", kind: "count" },
      { label: "Pickup Point", kind: "text" },
      { label: "Boardings", kind: "count" },
      { label: "Share", kind: "percent" },
    ],
    rows: zones.map((zone, index) => [index + 1, zone.zone, zone.commuters, total > 0 ? (zone.commuters / total) * 100 : 0]),
    emptyMessage: "No boardings in this date range.",
  };
}

export function buildGcashReport(data: AnalyticsData): ReportSpec {
  const health = data.gcash_health;
  const resolved = health.settled + health.failed + health.expired + health.cancelled;
  const share = (count: number) => (health.attempts > 0 ? (count / health.attempts) * 100 : null);
  const outcomes: [string, number][] = [
    ["Paid", health.settled],
    ["Failed", health.failed],
    ["Expired", health.expired],
    ["Cancelled", health.cancelled],
  ];
  // Payments still PENDING/PROCESSING are attempts with no outcome yet.
  if (health.attempts > resolved) outcomes.push(["Still in progress", health.attempts - resolved]);

  return {
    title: "GCash Payments",
    description: "What happened to each GCash payment started in this range. A group payment counts once.",
    columns: [
      { label: "Outcome", kind: "text" },
      { label: "Payments", kind: "count" },
      { label: "Share of Attempts", kind: "percent" },
    ],
    rows: health.attempts === 0 ? [] : [
      ...outcomes.map(([label, count]) => [label, count, share(count)]),
      ["All attempts", health.attempts, 100],
    ],
    emptyMessage: "No GCash payments were started in this date range.",
  };
}

const PANEL = "bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-5";

/** On lg the panel fills the rest of the page height; its body flexes into it. */
export function ReportPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className={`${PANEL} min-w-0 flex flex-col lg:flex-1 lg:min-h-[28rem]`}>
      <h2 className="text-lg font-bold text-white admin-light:text-slate-900">{title}</h2>
      <p className="text-xs text-slate-400 admin-light:text-slate-500 mb-4">{description}</p>
      {children}
    </section>
  );
}

/** Labelled figures in small neutral boxes; shared with the remittance report. */
export function SummaryBoxes({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
      {items.map((item) => (
        <div key={item.label} className="bg-[#0E1628] admin-light:bg-[#F1F5F9] rounded-lg p-2.5 border border-[#1E2D45] admin-light:border-[#E2E8F0]">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">{item.label}</p>
          <p className="text-sm font-bold tabular-nums text-white admin-light:text-slate-900 mt-0.5">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/** A spec rendered as a plain table, with its totals in boxes above it. */
export function ReportTable({ spec }: { spec: ReportSpec }) {
  const columns = spec.columns.map((column, index) => ({
    key: `c${index}`,
    label: column.label,
    align: (column.kind === "text" || column.kind === "date" ? "left" : "right") as "left" | "right",
    cellClassName: column.kind === "text" || column.kind === "date" ? "" : "tabular-nums",
  }));
  const items = spec.rows.map((row) =>
    Object.fromEntries(row.map((value, index) => [`c${index}`, formatCell(spec.columns[index].kind, value, "screen")]))
  );

  const totals = spec.rows.length > 0 && spec.totals
    ? spec.columns.flatMap((column, index) => {
        const value = spec.totals?.[index] ?? null;
        return value === null ? [] : [{ label: column.label, value: formatCell(column.kind, value, "screen") }];
      })
    : [];

  return (
    <ReportPanel title={spec.title} description={spec.description}>
      {totals.length > 0 && (
        <div className="mb-4 shrink-0">
          <SummaryBoxes items={totals} />
        </div>
      )}
      {/* Fixed 32rem below lg; on lg the table takes whatever height is left. */}
      <div className="h-[32rem] lg:h-auto lg:flex-1 lg:min-h-0">
        <DataTable
          data={items}
          columns={columns}
          searchQuery=""
          emptyMessage={spec.emptyMessage}
          height="100%"
          stickyHeader
          density="compact"
          mobileCards
        />
      </div>
    </ReportPanel>
  );
}
