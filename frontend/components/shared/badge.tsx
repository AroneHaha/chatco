// components/shared/badge.tsx
// Extracted from admin/ui/badge.tsx — shared across admin & conductor.

import { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: ReactNode;
  variant: BadgeVariant;
}

export function Badge({ children, variant }: BadgeProps) {
  const colors = {
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    // For states that are neither good nor bad — and, importantly, for the
    // "we don't recognise this value" fallback. Never colour an unknown
    // state green; see receipt-status.ts.
    neutral: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  };
  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[variant]}`}>{children}</span>;
}
