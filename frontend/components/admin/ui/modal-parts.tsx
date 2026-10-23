// components/admin/ui/modal-parts.tsx
// Shared pieces for admin confirm dialogs (delete, configuration): a header
// with a small label above the title, label/value rows, and the solid button
// styles. Follows the UI rules: solid surfaces, CHATCO Blue for primary, red
// only for destructive actions.
import type { ReactNode } from 'react';

export const ADMIN_BUTTON = {
  secondary: 'flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#2A3A55] bg-[#131C2E] px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-[#0E1628] disabled:cursor-not-allowed disabled:opacity-50 admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-slate-50',
  primary: 'flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#62A0EA] bg-[#62A0EA] px-4 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] disabled:cursor-not-allowed disabled:opacity-60 admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]',
  danger: 'flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:border-red-700 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60',
} as const;

export const ADMIN_FIELD = 'block min-h-11 w-full rounded-md border border-[#2A3A55] bg-[#131C2E] px-3 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-[#62A0EA] focus:outline-none focus:ring-2 focus:ring-[#62A0EA]/15 disabled:opacity-50 admin-light:border-[#CBD5E1] admin-light:bg-[#F8FAFC] admin-light:text-slate-900 admin-light:placeholder-slate-400 admin-light:focus:border-[#1A5FB4] admin-light:focus:ring-[#1A5FB4]/10';

export const ADMIN_LABEL = 'block text-[11px] font-semibold uppercase tracking-widest text-slate-400 admin-light:text-slate-500';

export function ModalKickerHeader({ kicker, destructive = false, title, description, titleId }: {
  kicker: string;
  /** Red label for permanent/destructive actions. */
  destructive?: boolean;
  title: string;
  description?: ReactNode;
  titleId?: string;
}) {
  return (
    <header className="border-b border-[#2A3A55] pb-5 pr-8 admin-light:border-[#E2E8F0]">
      <p className={`text-[11px] font-semibold uppercase tracking-widest ${destructive ? 'text-red-400 admin-light:text-red-600' : 'text-slate-400 admin-light:text-slate-500'}`}>{kicker}</p>
      <h2 id={titleId} className="mt-1.5 text-xl font-semibold tracking-tight break-words text-white sm:text-2xl admin-light:text-slate-900">{title}</h2>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-slate-400 admin-light:text-slate-500">{description}</p>}
    </header>
  );
}

export function DetailRows({ rows, className = '' }: { rows: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={`divide-y divide-[#2A3A55] border-b border-[#2A3A55] text-sm admin-light:divide-[#E2E8F0] admin-light:border-[#E2E8F0] ${className}`}>
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
          <dt className="shrink-0 text-slate-400 admin-light:text-slate-500">{row.label}</dt>
          <dd className="min-w-0 text-right font-medium break-words text-slate-200 admin-light:text-slate-800">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
