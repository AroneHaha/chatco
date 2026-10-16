'use client';

import { useAuth } from '@/contexts/auth-context';

export function getInitials(name: string): string {
  const words = name.split(/[\s@._-]+/).filter(Boolean);
  if (words.length === 0) return 'A';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

// Colours per surface: the sidebar is CHATCO blue (royal navy in dark mode,
// royal blue in light mode), while the mobile More sheet is a plain panel.
const PLAIN = {
  tile: 'bg-[#1A2540] border-[#1E2D45] text-[#62A0EA] admin-light:bg-[#EEF2F7] admin-light:border-[#E2E8F0] admin-light:text-[#1A5FB4]',
  name: 'admin-light:text-slate-900',
  meta: 'text-slate-500',
};
const ON_BRAND = {
  tile: 'bg-white/5 border-white/10 text-[#99C1F1] admin-light:bg-white/10 admin-light:border-white/15 admin-light:text-white',
  name: 'admin-light:text-white',
  meta: 'text-white/50 admin-light:text-white/60',
};

/** Signed-in administrator's name and email for the admin shell. */
export function AdminIdentity({ onBrand = false }: { onBrand?: boolean }) {
  const { user } = useAuth();
  if (!user) return null;

  // The backend falls back to the email when an admin has no profile, so
  // only show the email line when it adds information.
  const name = user.name?.trim() || user.email;
  const showEmail = name !== user.email;
  const tone = onBrand ? ON_BRAND : PLAIN;

  return (
    <div className="flex items-center gap-3 px-3 py-2 min-w-0">
      <span
        aria-hidden="true"
        className={`w-9 h-9 flex-shrink-0 rounded-md border ${tone.tile} text-xs font-semibold flex items-center justify-center`}
      >
        {getInitials(name)}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-semibold text-white ${tone.name} truncate`} title={name}>{name}</p>
        <p className={`text-[10px] ${tone.meta} truncate`} title={showEmail ? user.email : undefined}>
          {showEmail ? user.email : 'Administrator'}
        </p>
      </div>
    </div>
  );
}
