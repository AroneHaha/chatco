// components/admin/ui/settings-section.tsx
import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Card + icon heading used by the Settings pages (Financial Rules, Operations
 * Rules, Voucher Generator) so they share one look.
 */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#131C2E] admin-light:bg-white p-4 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        {/* Icon sits directly on the card, no tile behind it (UI rule: no boxed icons). */}
        <Icon size={28} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-[#62A0EA] admin-light:text-[#1A5FB4]" />
        <div>
          <h2 className="text-lg font-semibold text-white admin-light:text-slate-900">{title}</h2>
          <p className="text-xs text-slate-400 admin-light:text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Number input with its unit shown inside the right edge ("km/h", "rides").
 * `unitWidth` pads the input so long units don't overlap the value.
 */
export function UnitInput({
  unit,
  unitWidth = 'pr-14',
  className = '',
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & { unit: string; unitWidth?: string }) {
  return (
    <span className={`relative block ${className}`}>
      <input
        type="number"
        {...inputProps}
        className={`block w-full rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F8FAFC] py-2 pl-3 ${unitWidth} text-sm font-semibold tabular-nums text-white admin-light:text-slate-900 transition-colors focus:outline-none focus:ring-1 focus:ring-[#62A0EA] admin-light:focus:ring-[#1A5FB4]`}
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
        {unit}
      </span>
    </span>
  );
}
