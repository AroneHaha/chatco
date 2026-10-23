// components/admin/ui/inline-error.tsx
import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Error copy for admin modals: red text with an icon, no tinted box
 * (UI rules: no transparent fills; error copy sits right where the problem is).
 */
export function InlineError({ children, id, className = '' }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <p id={id} role="alert" className={`flex items-start gap-1.5 text-sm leading-relaxed text-red-400 admin-light:text-red-600 ${className}`}>
      <AlertCircle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}
