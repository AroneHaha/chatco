export interface RemittanceRecord {
  shiftId: string;
  date: string;
  conductorName: string;
  driverName: string;
  unitNumber: string;
  totalPassengers: number;
  cashlessBreakdown: {
    gcashScanned: number;
    gcashDirect: number;
    voucher: number;
  };
  totalCashless: number;
  cashDeclared: number; // legacy — kept for backward compat with old records
  remittanceStatus: "Pending" | "Remitted";
  timeIn: string;
  timeOut: string;
  cashTotal: number;    // system-tracked cash from Payment module
  gcashTotal: number;   // system-tracked GCash from Payment module
}

const KEY = "conductor_remittance_history";

function getAll(): RemittanceRecord[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const records = JSON.parse(raw) as RemittanceRecord[];
    // Backfill gcashTotal/cashTotal for old records that didn't have them
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

export function saveRemittance(record: RemittanceRecord) {
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

export function getUnitRemittanceHistory(unitNumber: string): RemittanceRecord[] {
  return getAll().filter((r) => r.unitNumber === unitNumber);
}
