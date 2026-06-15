// frontend/app/(admin)/settings/data/settings-data.ts
//
// Admin Settings data layer.
// All mock data removed. Data is fetched from the Laravel API via BFF.
// API responses are auto-transformed from snake_case to camelCase by lib/api.ts.

import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────

export type VoucherType = 'FREE_RIDE' | 'DISCOUNT';
export type VoucherStatus = 'Active' | 'Used' | 'Expired';

// ── Interfaces ────────────────────────────────────────────────────────

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  variables: string[];
  type?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Route {
  id: string;
  name: string;
  status: string | null;
  waypoints: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RemittanceOption {
  id: string;
  optionName: string;
}

export interface Voucher {
  id: string;
  code: string;
  type: string;
  status?: string | null;
  amount?: number | null;
  commuterId?: string | null;
  expiresAt?: string | null;
  rideOrigin?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface FinancialRulesConfig {
  id?: string;
  ridesForFreeReward: string;
  regularDiscount: string;
  studentDiscount: string;
  seniorDiscount: string;
  pwdDiscount: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperationsRulesConfig {
  id?: string;
  speedLimitKmh: string;
  maxShiftHours: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppConfiguration {
  id?: string;
  maintenanceMode: boolean;
  requireIdUpload: boolean;
  requirePhoneVerification: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SafetyConfig {
  id?: string;
  emergencyHotline: string;
  adminSosEmail: string;
  adminSOSEmail: string;
  senderGmail: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

// ── Raw API response shapes ───────────────────────────────────────────

interface RawNotificationTemplate {
  id: string;
  title: string | null;
  description: string | null;
  content: string | null;
  variables: string | null;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RawSafetyConfig {
  id: string;
  emergencyHotline: string | null;
  adminSosEmail: string | null;
  senderGmail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RawFinancialRules {
  id: string;
  ridesForFreeReward: number | null;
  regularDiscount: number | null;
  studentDiscount: number | null;
  seniorDiscount: number | null;
  pwdDiscount: number | null;
  createdAt: string;
  updatedAt: string;
}

interface RawOperationsRules {
  id: string;
  speedLimitKmh: number | null;
  maxShiftHours: number | null;
  createdAt: string;
  updatedAt: string;
}

interface RawAppConfiguration {
  id: string;
  maintenanceMode: boolean | null;
  requireIdUpload: boolean | null;
  requirePhoneVerification: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface SettingsDataResponse {
  faqs: FaqItem[];
  notificationTemplates: RawNotificationTemplate[];
  accountApprovedTemplate: RawNotificationTemplate | null;
  accountRejectedTemplate: RawNotificationTemplate | null;
  routes: Route[];
  remittanceOptions: RemittanceOption[];
  expenseCategories: ExpenseCategory[];
  vouchers: Voucher[];
  financialRules: RawFinancialRules | null;
  operationsRules: RawOperationsRules | null;
  appConfiguration: RawAppConfiguration | null;
  safetyConfig: RawSafetyConfig | null;
}

// ── Helpers ───────────────────────────────────────────────────────────

function parseVariables(vars: unknown): string[] {
  if (Array.isArray(vars)) return vars as string[];
  if (typeof vars === 'string' && vars.trim()) {
    try {
      const parsed = JSON.parse(vars);
      if (Array.isArray(parsed)) return parsed;
      return [String(parsed)];
    } catch {
      return vars.split(',').map((v) => v.trim()).filter(Boolean);
    }
  }
  return [];
}

function numToStr(val: number | null | undefined, fallback: string): string {
  return val != null ? String(val) : fallback;
}

function boolOrNull(val: boolean | null | undefined, fallback: boolean): boolean {
  return val ?? fallback;
}

function strOrNull(val: string | null | undefined, fallback: string): string {
  return val ?? fallback;
}

function processTemplate(raw: RawNotificationTemplate): NotificationTemplate {
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    content: raw.content ?? '',
    variables: parseVariables(raw.variables),
    type: raw.type,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ── Static template variables ─────────────────────────────────────────

export const approvedTemplateVariables: string[] = ['{commuterName}'];
export const rejectedTemplateVariables: string[] = ['{commuterName}', '{rejectionReason}'];

// ── Initial / default values ──────────────────────────────────────────

export const initialNotificationTemplates: NotificationTemplate[] = [];

export const initialAccountApprovedTemplate: string =
  'Dear {commuterName}, your account has been approved.';

export const initialAccountRejectedTemplate: string =
  'Dear {commuterName}, your account application has been rejected. Reason: {rejectionReason}.';

export const initialExpenseCategories: ExpenseCategory[] = [];
export const initialRoutes: Route[] = [];
export const initialRemittanceOptions: RemittanceOption[] = [];
export const initialVouchers: Voucher[] = [];
export const initialFaqs: FaqItem[] = [];

export const defaultFinancialRules: FinancialRulesConfig = {
  id: '',
  ridesForFreeReward: '10',
  regularDiscount: '0',
  studentDiscount: '20',
  seniorDiscount: '20',
  pwdDiscount: '20',
  createdAt: '',
  updatedAt: '',
};

export const defaultOperationsRules: OperationsRulesConfig = {
  id: '',
  speedLimitKmh: '60',
  maxShiftHours: '12',
  createdAt: '',
  updatedAt: '',
};

export const defaultAppConfiguration: AppConfiguration = {
  id: '',
  maintenanceMode: false,
  requireIdUpload: true,
  requirePhoneVerification: false,
  createdAt: '',
  updatedAt: '',
};

export const defaultSafetyConfig: SafetyConfig = {
  id: '',
  emergencyHotline: '911',
  adminSosEmail: 'admin@chatco.com',
  adminSOSEmail: 'admin@chatco.com',
  senderGmail: 'noreply@chatco.com',
  createdAt: '',
  updatedAt: '',
};

// ── Settings data shape ───────────────────────────────────────────────

interface SettingsData {
  faqs: FaqItem[];
  notificationTemplates: NotificationTemplate[];
  accountApprovedTemplate: string;
  accountRejectedTemplate: string;
  routes: Route[];
  remittanceOptions: RemittanceOption[];
  expenseCategories: ExpenseCategory[];
  vouchers: Voucher[];
  financialRules: FinancialRulesConfig;
  operationsRules: OperationsRulesConfig;
  appConfiguration: AppConfiguration;
  safetyConfig: SafetyConfig;
}

const EMPTY_DATA: SettingsData = {
  faqs: [],
  notificationTemplates: [],
  accountApprovedTemplate: initialAccountApprovedTemplate,
  accountRejectedTemplate: initialAccountRejectedTemplate,
  routes: [],
  remittanceOptions: [],
  expenseCategories: [],
  vouchers: [],
  financialRules: defaultFinancialRules,
  operationsRules: defaultOperationsRules,
  appConfiguration: defaultAppConfiguration,
  safetyConfig: defaultSafetyConfig,
};

// ── Hook ──────────────────────────────────────────────────────────────

export function useSettingsData() {
  const [data, setData] = useState<SettingsData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<SettingsDataResponse>('/api/admin/settings');

      const notificationTemplates = (result.notificationTemplates ?? []).map(processTemplate);

      const approvedRaw = result.accountApprovedTemplate;
      const approvedContent = approvedRaw ? (approvedRaw.content ?? initialAccountApprovedTemplate) : initialAccountApprovedTemplate;

      const rejectedRaw = result.accountRejectedTemplate;
      const rejectedContent = rejectedRaw ? (rejectedRaw.content ?? initialAccountRejectedTemplate) : initialAccountRejectedTemplate;

      const rawFin = result.financialRules;
      const financialRules: FinancialRulesConfig = rawFin
        ? {
            id: rawFin.id,
            ridesForFreeReward: numToStr(rawFin.ridesForFreeReward, defaultFinancialRules.ridesForFreeReward),
            regularDiscount: numToStr(rawFin.regularDiscount, defaultFinancialRules.regularDiscount),
            studentDiscount: numToStr(rawFin.studentDiscount, defaultFinancialRules.studentDiscount),
            seniorDiscount: numToStr(rawFin.seniorDiscount, defaultFinancialRules.seniorDiscount),
            pwdDiscount: numToStr(rawFin.pwdDiscount, defaultFinancialRules.pwdDiscount),
            createdAt: rawFin.createdAt,
            updatedAt: rawFin.updatedAt,
          }
        : defaultFinancialRules;

      const rawOps = result.operationsRules;
      const operationsRules: OperationsRulesConfig = rawOps
        ? {
            id: rawOps.id,
            speedLimitKmh: numToStr(rawOps.speedLimitKmh, defaultOperationsRules.speedLimitKmh),
            maxShiftHours: numToStr(rawOps.maxShiftHours, defaultOperationsRules.maxShiftHours),
            createdAt: rawOps.createdAt,
            updatedAt: rawOps.updatedAt,
          }
        : defaultOperationsRules;

      const rawApp = result.appConfiguration;
      const appConfiguration: AppConfiguration = rawApp
        ? {
            id: rawApp.id,
            maintenanceMode: boolOrNull(rawApp.maintenanceMode, defaultAppConfiguration.maintenanceMode),
            requireIdUpload: boolOrNull(rawApp.requireIdUpload, defaultAppConfiguration.requireIdUpload),
            requirePhoneVerification: boolOrNull(rawApp.requirePhoneVerification, defaultAppConfiguration.requirePhoneVerification),
            createdAt: rawApp.createdAt,
            updatedAt: rawApp.updatedAt,
          }
        : defaultAppConfiguration;

      const rawSafety = result.safetyConfig;
      const safetyConfig: SafetyConfig = rawSafety
        ? {
            id: rawSafety.id,
            emergencyHotline: strOrNull(rawSafety.emergencyHotline, defaultSafetyConfig.emergencyHotline),
            adminSosEmail: strOrNull(rawSafety.adminSosEmail, defaultSafetyConfig.adminSosEmail),
            adminSOSEmail: strOrNull(rawSafety.adminSosEmail, defaultSafetyConfig.adminSOSEmail),
            senderGmail: strOrNull(rawSafety.senderGmail, defaultSafetyConfig.senderGmail),
            createdAt: rawSafety.createdAt,
            updatedAt: rawSafety.updatedAt,
          }
        : defaultSafetyConfig;

      setData({
        faqs: result.faqs ?? [],
        notificationTemplates,
        accountApprovedTemplate: approvedContent,
        accountRejectedTemplate: rejectedContent,
        routes: result.routes ?? [],
        remittanceOptions: result.remittanceOptions ?? [],
        expenseCategories: result.expenseCategories ?? [],
        vouchers: result.vouchers ?? [],
        financialRules,
        operationsRules,
        appConfiguration,
        safetyConfig,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load settings data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch, setData };
}