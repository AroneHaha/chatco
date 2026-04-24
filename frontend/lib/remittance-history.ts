export interface RemittanceRecord {
  shiftId: string;
  date: string;
  conductorName: string;
  driverName: string;
  unitNumber: string;
  totalPassengers: number;
  cashlessBreakdown: {
    scanned: number;
    prepaid: number;
    voucher: number;
  };
  totalCashless: number;
  cashDeclared: number;
  remittanceStatus: "Pending" | "Remitted";
  timeIn: string;
  timeOut: string;
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

  // Prevent duplicate entries for the same shift
  const alreadyExists = records.some((r) => r.shiftId === record.shiftId);
  if (alreadyExists) return records;

  records.unshift(record);
  save(records);
  return records;
}

/** Get all remittance records */
export function getRemittanceHistory(): RemittanceRecord[] {
  return getAll();
}

/** Get remittance records for a specific unit */
export function getUnitRemittanceHistory(unitNumber: string): RemittanceRecord[] {
  return getAll().filter((r) => r.unitNumber === unitNumber);
}