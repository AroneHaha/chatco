// RemittanceRecord lives in @/types (types/shift.ts) — the single source of
// truth. Re-exported here so existing conductor-side imports of this module
// keep working without touching every call site.
export type { RemittanceRecord } from "@/types";
import type { RemittanceRecord } from "@/types";

const KEY = "conductor_remittance_history";

function getAll(): RemittanceRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const records = JSON.parse(raw) as RemittanceRecord[];
    return records.map((r) => ({
      ...r,
      gcashTotal: r.gcashTotal ?? 0,
      cashTotal: r.cashTotal ?? 0,
      cashDeclared: r.cashDeclared ?? 0,
    }));
  } catch {
    return [];
  }
}

function save(records: RemittanceRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

export function saveRemittance(record: RemittanceRecord): RemittanceRecord[] {
  const records = getAll();
  const alreadyExists = records.some((r) => r.shiftId === record.shiftId);
  if (alreadyExists) return records;
  records.unshift(record);
  save(records);
  return records;
}

export function getRemittanceHistory(): RemittanceRecord[] {
  return getAll();
}
