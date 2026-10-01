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
    <section className={`rounded-lg border border-[#1E2D45] bg-[#131C2E] p-4 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#62A0EA]/10 text-[#62A0EA]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-xs text-slate-400">{description}</p>
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
        className={`block w-full rounded-md border border-[#1E2D45] bg-[#0E1628] py-2 pl-3 ${unitWidth} text-sm font-semibold tabular-nums text-white transition-colors focus:outline-none focus:ring-1 focus:ring-[#62A0EA]`}
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
        {unit}
      </span>
    </span>
  );
}
