// lib/static-conductor-data.ts
// Pure static mock data for conductor detail modal.

export interface RemittanceRecord {
  shiftId: string;
  date: string;
  conductorName: string;
  driverName: string;
  unitNumber: string;
  totalPassengers: number;
  gcashAmount: number;
  cashAmount: number;
  remittanceStatus: 'Pending' | 'Remitted';
  timeIn: string;
  timeOut: string;
}

export interface Transaction {
  transactionId: string;
  paymentMethod: 'GCash' | 'Cash';
  finalAmount: number;
  passengerName: string;
  passengerId: string;
  from: string;
  to: string;
  distance: number;
  baseFare: number;
  succeedingKm: number;
  timestamp: number;
}

export interface ShiftLog {
  shiftId: string;
  unitNumber: string;
  plateNumber: string;
  conductorName: string;
  driverName: string;
  route: string;
  timeIn: string;
  timeOut: string | null;
  duration: string | null;
}

export function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

const CONDUCTOR_MASTER: Record<string, { vehicle: string; driver: string; route: string }> = {
  'jose ngani':       { vehicle: 'XQJ 4728', driver: 'Ramon Dela Cruz',  route: 'Malolos - Calumpit' },
  'ericks son':       { vehicle: 'LKW 3579', driver: 'Pedro Santos',     route: 'Calumpit - Malolos' },
  'pedro penduko':    { vehicle: 'VMY 9183', driver: 'Luis Villanueva',  route: 'Malolos - Calumpit' },
  'luigi mansion':    { vehicle: 'RZP 6041', driver: 'Antonio Reyes',    route: 'Calumpit - Malolos' },
  'sisa doe':         { vehicle: 'TNB 8462', driver: 'Francisco Garcia', route: 'Malolos - Calumpit' },
  'juan dela cruz':   { vehicle: 'JHX 7905', driver: 'Roberto Santiago', route: 'Calumpit - Malolos' },
  'maria makiling':   { vehicle: 'PVR 6894', driver: 'Elena Valdez',     route: 'Malolos - Calumpit' },
  'mhaku jose':       { vehicle: 'QFD 2316', driver: 'Daniel Fajardo',   route: 'Calumpit - Malolos' },
  'karding dela paz': { vehicle: 'LKW 3579', driver: 'Henry Lapid',      route: 'Malolos - Calumpit' },
};

const PASSENGER_NAMES = [
  'Maria Santos','Juan Dela Cruz','Ana Reyes','Pedro Garcia','Rosa Lim',
  'Miguel Torres','Carmen Flores','Jose Ramos','Elena Navarro','Ricardo Molina',
  'Sofia Chavez','Antonio Villanueva','Isabel Cruz','Fernando Lopez','Luz Mendoza',
  'Andres Bautista','Teresa Aquino','Roberto Reyes','Grace Gonzales','Daniel Flores',
  'Patricia Rivera','Eduardo Tan','Linda Ong','Manuel Dizon','Nora Cardenas',
  'Cesar Mercado','Alicia Vera','Ramon Ignacio','Elena Soriano','Jorge Fajardo',
  'Nenita Pangilinan','Henry Lapid','Cherry Basilio','Willy Rosales','Lilia Noble',
  'Arnel Quintos','Fe Dagohoy','Rolando Espiritu','Gloria Salazar','Noel Tantiangco',
];

const ROUTE_STOPS = [
  ['Malolos Terminal','Meycauayan Crossing','Calumpit Town Proper'],
  ['Calumpit Town Proper','Guiguinto Stop','Malolos Terminal'],
  ['Malolos Terminal','Marilao Highroad','Meycauayan Crossing'],
  ['Meycauayan Crossing','Guiguinto Stop','Calumpit Town Proper'],
  ['Calumpit Town Proper','Marilao Highroad','Malolos Terminal'],
];

const PAYMENT_METHODS: Transaction['paymentMethod'][] = ['GCash', 'Cash'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); hash = ((hash << 5) - hash) + c; hash |= 0; }
  return Math.abs(hash);
}

export function getStaticRemittanceHistory(conductorName: string): RemittanceRecord[] {
  const key = conductorName.toLowerCase().trim();
  const info = CONDUCTOR_MASTER[key];
  if (!info) return [];
  const rng = seededRandom(hashString(key) + 100);
  const records: RemittanceRecord[] = [];
  const statuses: RemittanceRecord['remittanceStatus'][] = ['Remitted','Pending','Remitted','Remitted','Remitted'];
  const baseDates = ['2024-04-15','2024-04-18','2024-04-22','2024-04-25','2024-04-28','2024-05-01','2024-05-03','2024-05-05','2024-05-07','2024-05-09'];
  for (let i = 0; i < 10; i++) {
    const gcashAmount = Math.round((rng() * 1200 + 800) * 100) / 100;
    const cashAmount = Math.round((rng() * 800 + 400) * 100) / 100;
    const passengers = Math.floor(rng() * 30) + 40;
    const hIn = 5 + Math.floor(rng() * 2), mIn = Math.floor(rng() * 60);
    const hOut = 15 + Math.floor(rng() * 4), mOut = Math.floor(rng() * 60);
    records.push({
      shiftId: `S-${200 + i}`, date: baseDates[i], conductorName, driverName: info.driver,
      unitNumber: info.vehicle, totalPassengers: passengers, gcashAmount, cashAmount,
      remittanceStatus: statuses[i % statuses.length],
      timeIn: `${baseDates[i]}T${String(hIn).padStart(2,'0')}:${String(mIn).padStart(2,'0')}:00.000Z`,
      timeOut: `${baseDates[i]}T${String(hOut).padStart(2,'0')}:${String(mOut).padStart(2,'0')}:00.000Z`,
    });
  }
  return records;
}

export function getStaticShiftLogs(conductorName: string): ShiftLog[] {
  const key = conductorName.toLowerCase().trim();
  const info = CONDUCTOR_MASTER[key];
  if (!info) return [];
  const rng = seededRandom(hashString(key) + 200);
  const logs: ShiftLog[] = [];
  const baseDates = ['2024-04-15','2024-04-18','2024-04-22','2024-04-25','2024-04-28','2024-05-01','2024-05-03','2024-05-05','2024-05-07','2024-05-09'];
  for (let i = 0; i < 10; i++) {
    const hIn = 5 + Math.floor(rng() * 2), mIn = Math.floor(rng() * 60);
    const hOut = 15 + Math.floor(rng() * 4), mOut = Math.floor(rng() * 60);
    logs.push({
      shiftId: `S-${200 + i}`, unitNumber: info.vehicle, plateNumber: info.vehicle,
      conductorName, driverName: info.driver, route: info.route,
      timeIn: `${baseDates[i]}T${String(hIn).padStart(2,'0')}:${String(mIn).padStart(2,'0')}:00.000Z`,
      timeOut: `${baseDates[i]}T${String(hOut).padStart(2,'0')}:${String(mOut).padStart(2,'0')}:00.000Z`,
      duration: `${hOut - hIn}h ${String(Math.abs(mOut - mIn)).padStart(2,'0')}m`,
    });
  }
  return logs;
}

export function getStaticShiftTransactions(shiftId: string, conductorName: string): Transaction[] {
  const key = conductorName.toLowerCase().trim();
  const info = CONDUCTOR_MASTER[key];
  if (!info) return [];
  const rng = seededRandom(hashString(shiftId) + 300);
  const txns: Transaction[] = [];
  const numTxns = Math.floor(rng() * 15) + 20;
  const baseTs = new Date('2024-05-01T06:00:00.000Z').getTime();
  for (let i = 0; i < numTxns; i++) {
    const method = PAYMENT_METHODS[Math.floor(rng() * PAYMENT_METHODS.length)];
    const pIdx = Math.floor(rng() * PASSENGER_NAMES.length);
    const rIdx = Math.floor(rng() * ROUTE_STOPS.length);
    const dist = Math.round((rng() * 15 + 3) * 10) / 10;
    const baseF = 13, succ = Math.max(0, dist - 5) * 1.85;
    const amt = Math.round((baseF + succ) * 100) / 100;
    txns.push({
      transactionId: `TXN-${shiftId}-${String(i+1).padStart(3,'0')}`, paymentMethod: method, finalAmount: amt,
      passengerName: PASSENGER_NAMES[pIdx], passengerId: `PID-${String(Math.floor(rng()*90000)+10000)}`,
      from: ROUTE_STOPS[rIdx][0], to: ROUTE_STOPS[rIdx][ROUTE_STOPS[rIdx].length-1],
      distance: dist, baseFare: baseF, succeedingKm: Math.round(succ*100)/100,
      timestamp: baseTs + i * Math.floor(rng()*600000+120000),
    });
  }
  return txns;
}