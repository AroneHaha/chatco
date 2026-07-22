// app/(admin)/settings/data/settings-data.ts

// --- Types ---

export type VoucherType = 'FREE_RIDE' | 'DISCOUNT';

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

export interface Voucher {
  id: string;
  code: string;
  type: string;
  status: VoucherStatus;
}

export interface FinancialRulesConfig {
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

// Controls the fare receipt auto-printed on the conductor's thermal printer
// after a successful cash/GCash transaction. Text fields customize the
// printout's branding; the toggles decide which transaction details appear.
export interface ReceiptConfig {
  businessName: string;
  addressLine: string;
  footerNote: string;
  paperWidth: '58' | '80'; // mm — standard thermal roll widths
  autoPrint: boolean;
  showDateTime: boolean;
  showTransactionId: boolean;
  showRoute: boolean;
  showUnit: boolean;
  showConductor: boolean;
  showPassenger: boolean;
  showFareBreakdown: boolean;
}

// --- FAQ Data ---

export const initialFaqs: FaqItem[] = [
  { id: '1', question: 'How do I pay with GCash?', answer: 'Simply show your QR code to the conductor when boarding. They scan it and payment is processed instantly via GCash.', displayOrder: 1 },
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
    id: 'ride-receipt',
    title: 'Digital Receipt (To Commuter)',
    description: 'Sent after a cashless transaction is completed.',
    content: '🧾 Ride Receipt\n\nPlate: {vehiclePlate}\nRoute: {routeName}\nFare: ₱{fareAmount}\nPayment: {paymentMethod}\nDate: {date}\n\nThank you for riding with Chatco!',
    variables: ['{vehiclePlate}', '{routeName}', '{fareAmount}', '{paymentMethod}', '{date}'],
  },
];

export const initialAccountApprovedTemplate: string =
  `Dear {commuterName},\n\nCongratulations! Your Chatco Commuter account has been successfully approved and verified.\n\nYou can now log in to the app using your registered credentials and start enjoying seamless cashless rides across the Chatco network.\n\nIf you did not request this account, please contact support immediately.\n\nSafe travels!\nThe Chatco Team`;

export const initialAccountRejectedTemplate: string =
  `Dear {commuterName},\n\nWe regret to inform you that your Chatco Commuter account registration has been rejected.\n\nReason: {rejectionReason}\n\nIf you believe this is a mistake, you may re-apply with valid and updated identification documents through the app or visit our local office.\n\nThank you for your understanding.\nThe Chatco Team`;

export const approvedTemplateVariables: string[] = ['{commuterName}'];
export const rejectedTemplateVariables: string[] = ['{commuterName}', '{rejectionReason}'];

// --- Expense Categories ---

export const initialExpenseCategories: string[] = [
  'Gas / Fuel',
  'Boundary / Remittance',
  'Vehicle Washing',
  'Tire Change / Repair',
];

// --- Default Config Values ---

export const defaultFinancialRules: FinancialRulesConfig = {
  ridesForFreeReward: '10',
  regularDiscount: '0',
  studentDiscount: '20',
  seniorDiscount: '20',
  pwdDiscount: '20',
};

export const defaultOperationsRules: OperationsRulesConfig = {
  // Keep in sync with LocationService::speedLimitKmh()'s fallback — this is
  // what Operations Rules shows before an admin has saved an explicit limit.
  speedLimitKmh: '50',
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

export const defaultReceiptConfig: ReceiptConfig = {
  businessName: 'CHATCO',
  addressLine: '',
  footerNote: 'Thank you for riding with Chatco!',
  paperWidth: '58',
  autoPrint: true,
  showDateTime: true,
  showTransactionId: true,
  showRoute: true,
  showUnit: true,
  showConductor: true,
  showPassenger: true,
  showFareBreakdown: true,
};