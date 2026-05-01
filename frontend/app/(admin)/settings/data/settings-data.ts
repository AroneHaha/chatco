// app/(admin)/settings/data/settings-data.ts

// --- Types ---

export type VoucherType = 'FREE_RIDE' | 'WALLET';

export type VoucherStatus = 'Active' | 'Used' | 'Expired';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
}

export interface NotificationTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  variables: string[];
}

export interface Route {
  id: number;
  name: string;
  status: 'Active' | 'Inactive';
  waypoints: string;
}

export interface RemittanceOption {
  id: number;
  optionName: string;
}

export interface Voucher {
  id: string;
  code: string;
  type: string;
  status: VoucherStatus;
}

export interface FareConfig {
  baseFare: string;
  baseDistanceKm: string;
  succeedingRatePerKm: string;
}

export interface FinancialRulesConfig {
  minLoad: string;
  maxLoad: string;
  ridesForFreeReward: string;
  regularDiscount: string;
  studentDiscount: string;
  seniorDiscount: string;
  pwdDiscount: string;
}

export interface OperationsRulesConfig {
  speedLimitKmh: string;
  maxShiftHours: string;
}

export interface AppConfiguration {
  maintenanceMode: boolean;
  requireIdUpload: boolean;
  requirePhoneVerification: boolean;
}

export interface SafetyConfig {
  emergencyHotline: string;
  adminSOSEmail: string;
  senderGmail: string;
}

// --- FAQ Data ---

export const initialFaqs: FaqItem[] = [
  { id: '1', question: 'How do I top-up my wallet?', answer: 'Go to the Wallet tab, click "Load Wallet", and enter the amount. You can pay via GCash or over-the-counter.', displayOrder: 1 },
  { id: '2', question: 'I left my item on the jeep. How do I report it?', answer: 'Go to the "Lost & Found" section in the app menu and fill out the item report form with the details of your trip.', displayOrder: 2 },
];

// --- Notification Templates ---

export const initialNotificationTemplates: NotificationTemplate[] = [
  {
    id: 'sos-admin',
    title: 'SOS Alert (To Admin)',
    description: 'Sent to the admin dashboard when a conductor triggers the panic button.',
    content: '🚨 EMERGENCY ALERT!\n\nUnit: {vehiclePlate}\nConductor: {conductorName}\nLocation: {latitude}, {longitude}\nTime: {timestamp}\n\nImmediate action required!',
    variables: ['{vehiclePlate}', '{conductorName}', '{latitude}', '{longitude}', '{timestamp}'],
  },
  {
    id: 'wallet-loaded',
    title: 'Wallet Loaded (To Commuter)',
    description: 'Sent to the commuter when they successfully top up their wallet.',
    content: 'Hi {commuterName}! 💵\n\nYour Chatco wallet has been successfully loaded with ₱{amount}. Your new balance is ₱{newBalance}.\n\nKeep safe on your ride!',
    variables: ['{commuterName}', '{amount}', '{newBalance}'],
  },
  {
    id: 'ride-receipt',
    title: 'Digital Receipt (To Commuter)',
    description: 'Sent after a cashless transaction is completed.',
    content: '🧾 Ride Receipt\n\nPlate: {vehiclePlate}\nRoute: {routeName}\nFare: ₱{fareAmount}\nPayment: {paymentMethod}\nDate: {date}\n\nThank you for riding with Chatco!',
    variables: ['{vehiclePlate}', '{routeName}', '{fareAmount}', '{paymentMethod}', '{date}'],
  },
];

export const initialAccountApprovedTemplate: string =
  `Dear {commuterName},\n\nCongratulations! 🎉 Your Chatco Commuter account has been successfully approved and verified.\n\nYou can now log in to the app using your registered credentials and start enjoying seamless cashless rides across the Chatco network.\n\nIf you did not request this account, please contact support immediately.\n\nSafe travels!\nThe Chatco Team`;

export const initialAccountRejectedTemplate: string =
  `Dear {commuterName},\n\nWe regret to inform you that your Chatco Commuter account registration has been rejected.\n\nReason: {rejectionReason}\n\nIf you believe this is a mistake, you may re-apply with valid and updated identification documents through the app or visit our local office.\n\nThank you for your understanding.\nThe Chatco Team`;

export const approvedTemplateVariables: string[] = ['{commuterName}'];
export const rejectedTemplateVariables: string[] = ['{commuterName}', '{rejectionReason}'];

// --- Routes Data (placeholder for future multi-route support) ---

export const initialRoutes: Route[] = [
  { id: 1, name: 'Malolos - Meycauayan - Calumpit', status: 'Active', waypoints: 'Malolos Terminal, Guiguinto, Meycauayan Crossing, Calumpit Town Proper' },
];

// --- Remittance Options Data ---

export const initialRemittanceOptions: RemittanceOption[] = [
  { id: 1, optionName: 'Operator Juan' },
  { id: 2, optionName: 'Bank Deposit BPI' },
  { id: 3, optionName: 'Driver Pedro' },
];

// --- Expense Categories ---

export const initialExpenseCategories: string[] = [
  'Gas / Fuel',
  'Boundary / Remittance',
  'Vehicle Washing',
  'Tire Change / Repair',
];

// --- Default Config Values ---

export const defaultFareConfig: FareConfig = {
  baseFare: '18',
  baseDistanceKm: '4',
  succeedingRatePerKm: '2',
};

export const defaultFinancialRules: FinancialRulesConfig = {
  minLoad: '20',
  maxLoad: '1000',
  ridesForFreeReward: '10',
  regularDiscount: '0',
  studentDiscount: '20',
  seniorDiscount: '20',
  pwdDiscount: '20',
};

export const defaultOperationsRules: OperationsRulesConfig = {
  speedLimitKmh: '60',
  maxShiftHours: '12',
};

export const defaultAppConfiguration: AppConfiguration = {
  maintenanceMode: false,
  requireIdUpload: true,
  requirePhoneVerification: false,
};

export const defaultSafetyConfig: SafetyConfig = {
  emergencyHotline: '911',
  adminSOSEmail: 'admin@chatco.com',
  senderGmail: 'noreply@chatco.com',
};