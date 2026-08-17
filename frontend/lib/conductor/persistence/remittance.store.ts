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
  cashDeclared: number;
  remittanceStatus: "Pending" | "Overdue" | "Remitted" | "Shortage" | "Overage";
  timeIn: string;
  timeOut: string;
  cashTotal: number;
  gcashTotal: number;
  shortage?: number;
  overage?: number;
  dueAt?: string | null;
  remittedAt?: string | null;
  reminderCount?: number;
  deviceId?: string;
  deviceType?: "WEB" | "MOBILE";
}

const KEY = "conductor_remittance_history";

function getAll(): RemittanceRecord[] {
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
