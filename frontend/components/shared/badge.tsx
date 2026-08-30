// components/shared/badge.tsx
// Extracted from admin/ui/badge.tsx — shared across admin & conductor.

import { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: ReactNode;
  variant: BadgeVariant;
}

// Exported so surfaces that need a badge-styled but interactive element
// (e.g. a clickable status pill) can reuse the exact same palette instead of
// duplicating it — see remittance-table.tsx's status-badge dropdown trigger.
export const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-green-500/20 text-green-400 border border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  // For states that are neither good nor bad — and, importantly, for the
  // "we don't recognise this value" fallback. Never colour an unknown
  // state green; see receipt-status.ts.
  neutral: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
};

export function Badge({ children, variant }: BadgeProps) {
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${BADGE_VARIANT_CLASSES[variant]}`}>{children}</span>;
}
