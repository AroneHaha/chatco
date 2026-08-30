// lib/shared/remittance-status.ts
//
// Single source of truth for RemittanceStatus → Badge color, replacing the
// ad-hoc ternaries previously duplicated across remittance-table.tsx,
// conductor-detail-modal.tsx, and the conductor's HistorySection/
// OfficialReportModal — all of which need to agree once a 6th status
// ("For Cash Declaration") exists.

import type { RemittanceStatus } from "@/types";
import type { BadgeVariant } from "@/components/shared/badge";

export function remittanceStatusVariant(status: RemittanceStatus): BadgeVariant {
  switch (status) {
    case "Settled":
      return "success";
    case "For Cash Declaration":
      return "info";
    case "Pending":
    case "Overdue":
      return "warning";
    case "Shortage":
    case "Overage":
      return "danger";
  }
}

/** Same status→category as remittanceStatusVariant(), re-skinned to the
 * conductor app shell's dark/glow badge language (translucent border+bg on
 * navy) instead of the admin flat Badge component — used by HistorySection
 * and OfficialReportModal (in-app view; buildPrintHTML has its own
 * light-paper equivalent). */
export const REMITTANCE_STATUS_PILL_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  info: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
  neutral: "bg-white/10 text-white/60 border-white/20",
};
