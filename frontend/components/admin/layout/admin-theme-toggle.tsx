'use client';

import { useAdminTheme } from '@/contexts/admin-theme-context';
import { ThemeToggleIcons } from '@/components/commuter/profile/profile-theme-toggle';

/**
 * Same Moon/Sun swap as the commuter toggle, in the admin shape language:
 * squared like the notification bell beside it, border + tone instead of glow.
 */
export function AdminThemeToggle({ onBrand = false }: { onBrand?: boolean }) {
  const [theme, setTheme] = useAdminTheme();
  const isLight = theme === 'light';
  // In light mode the sidebar is CHATCO blue: a translucent white square there,
  // the warm amber square on white surfaces (mobile More sheet).
  const lightStyle = onBrand
    ? 'border-white/20 bg-white/10 text-amber-200 hover:border-white/30 hover:bg-white/20 focus-visible:ring-white'
    : 'border-amber-300 bg-amber-50 text-amber-600 hover:border-amber-400 hover:bg-amber-100 admin-light:focus-visible:ring-[#1A5FB4]';

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      aria-label="Toggle dark and light mode"
      aria-pressed={isLight}
      title={isLight ? 'Light mode · Switch to dark mode' : 'Dark mode · Switch to light mode'}
      className={`relative w-10 h-10 shrink-0 overflow-hidden rounded-xl border flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] ${
        isLight
          ? lightStyle
          : 'border-white/10 bg-white/5 text-[#99C1F1] hover:bg-white/10 hover:text-white'
      }`}
    >
      <ThemeToggleIcons isLight={isLight} size={18} />
    </button>
  );
}
