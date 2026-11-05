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

/**
 * On/off switch for Settings pages. Label it with an element whose id is
 * `${id}-label` and describe it with `${id}-hint`.
 */
export function ConfigSwitch({
  id,
  checked,
  onChange,
  tone = 'blue',
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone?: 'blue' | 'amber';
}) {
  return (
    <label className="relative inline-flex h-11 w-12 shrink-0 cursor-pointer items-center">
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 rounded-full bg-[#2A3951] admin-light:bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#8CB9F0] admin-light:peer-focus-visible:ring-[#1A5FB4] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#111A2B] admin-light:peer-focus-visible:ring-offset-white peer-disabled:opacity-50 ${tone === 'amber' ? 'peer-checked:bg-amber-500' : 'peer-checked:bg-[#62A0EA] admin-light:peer-checked:bg-[#1A5FB4]'}`}
      />
    </label>
  );
}
