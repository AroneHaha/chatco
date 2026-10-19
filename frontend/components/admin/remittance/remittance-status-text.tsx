import type { RemittanceStatus } from '@/types';
import type { BadgeVariant } from '@/components/shared/badge';
import { remittanceStatusVariant } from '@/lib/shared/remittance-status';

/** Text colour per status variant — dark and admin light mode. */
export const STATUS_TEXT_CLASSES: Record<BadgeVariant, string> = {
  success: 'text-emerald-400 admin-light:text-emerald-700',
  warning: 'text-amber-400 admin-light:text-amber-700',
  danger: 'text-red-400 admin-light:text-red-600',
  info: 'text-blue-400 admin-light:text-blue-700',
  neutral: 'text-slate-400 admin-light:text-slate-600',
};

/**
 * Remittance status as coloured text with a leading dot, not a pill — the
 * same treatment as vehicle status in Fleet Management.
 */
export function RemittanceStatusText({ status }: { status: RemittanceStatus }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold ${STATUS_TEXT_CLASSES[remittanceStatusVariant(status)]}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );
}
