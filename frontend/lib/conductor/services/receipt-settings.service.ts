import { api } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";

export interface ReceiptSettings {
  businessName: string;
  addressLine: string;
  footerNote: string;
  paperWidth: "58" | "80";
  autoPrint: boolean;
  showDateTime: boolean;
  showTransactionId: boolean;
  showRoute: boolean;
  showUnit: boolean;
  showConductor: boolean;
  showPassenger: boolean;
  showFareBreakdown: boolean;
}

type ReceiptSettingsMap = Record<string, string | null>;

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  businessName: "CHATCO",
  addressLine: "",
  footerNote: "Thank you for riding with Chatco!",
  paperWidth: "58",
  autoPrint: true,
  showDateTime: true,
  showTransactionId: true,
  showRoute: true,
  showUnit: true,
  showConductor: true,
  showPassenger: true,
  showFareBreakdown: true,
};

function bool(value: string | null | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  return value === "true" || value === "1";
}

export async function fetchReceiptSettings(): Promise<ReceiptSettings> {
  const response = await api.get<{ data: ReceiptSettingsMap }>(
    CONDUCTOR_API.receiptSettings
  );
  const data = response.data ?? {};

  return {
    businessName: data.receipt_business_name ?? DEFAULT_RECEIPT_SETTINGS.businessName,
    addressLine: data.receipt_address_line ?? DEFAULT_RECEIPT_SETTINGS.addressLine,
    footerNote: data.receipt_footer_note ?? DEFAULT_RECEIPT_SETTINGS.footerNote,
    paperWidth: data.receipt_paper_width === "80" ? "80" : "58",
    autoPrint: bool(data.receipt_auto_print, DEFAULT_RECEIPT_SETTINGS.autoPrint),
    showDateTime: bool(data.receipt_show_datetime, DEFAULT_RECEIPT_SETTINGS.showDateTime),
    showTransactionId: bool(data.receipt_show_transaction_id, DEFAULT_RECEIPT_SETTINGS.showTransactionId),
    showRoute: bool(data.receipt_show_route, DEFAULT_RECEIPT_SETTINGS.showRoute),
    showUnit: bool(data.receipt_show_unit, DEFAULT_RECEIPT_SETTINGS.showUnit),
    showConductor: bool(data.receipt_show_conductor, DEFAULT_RECEIPT_SETTINGS.showConductor),
    showPassenger: bool(data.receipt_show_passenger, DEFAULT_RECEIPT_SETTINGS.showPassenger),
    showFareBreakdown: bool(data.receipt_show_fare_breakdown, DEFAULT_RECEIPT_SETTINGS.showFareBreakdown),
  };
}
