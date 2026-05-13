export interface RemittanceRecord {
  shiftId: string;
  date: string;
  conductorName: string;
  driverName: string;
  unitNumber: string;
  totalPassengers: number;
  cashlessBreakdown: {
    gcashScanned: number;
    voucher: number;
  };
  totalCashless: number;
  cashDeclared: number;
  remittanceStatus: "Pending" | "Remitted";
  timeIn: string;
  timeOut: string;
  cashTotal?: number;
  gcashTotal?: number;
}

const KEY = "conductor_remittance_history";

function getAll(): RemittanceRecord[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RemittanceRecord[];
  } catch {
    return [];
  }
}

function save(records: RemittanceRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

/** Save a new remittance record (newest first) */
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
