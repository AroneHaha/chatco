// components/admin/ui/settings-drawer.tsx
'use client';

import { createContext, useContext, useState, useCallback, ReactNode, Suspense, lazy, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { SkeletonFareMatrix } from './skeleton/skeleton-fare-matrix';
import { useAdminTheme } from '@/contexts/admin-theme-context';
import {
  X, Calculator, PiggyBank, Ticket, Gauge,
  Shield, MessageCircleQuestion, Settings2, ArrowLeft, Printer, ChevronRight, UserRoundCog, Moon
} from 'lucide-react';

// ─── Lazy-loaded settings page components ───
// Instead of iframes (which lose the session cookie and redirect to /login),
// we import the page components directly and render them inside the drawer.
// This eliminates all iframe/cookie/auth issues.

const FareMatrixPage = lazy(() => import('@/app/(admin)/settings/fare-matrix/page'));
const FinancialRulesPage = lazy(() => import('@/app/(admin)/settings/financial-rules/page'));
const VoucherGeneratorPage = lazy(() => import('@/app/(admin)/settings/voucher-generator/page'));
const OperationsRulesPage = lazy(() => import('@/app/(admin)/settings/operations-rules/page'));
const SafetyNotificationsPage = lazy(() => import('@/app/(admin)/settings/safety-notifications/page'));
const ReceiptPage = lazy(() => import('@/app/(admin)/settings/receipt/page'));
const FaqManagementPage = lazy(() => import('@/app/(admin)/settings/faq-management/page'));
const AppConfigurationPage = lazy(() => import('@/app/(admin)/settings/app-configuration/page'));
const ProfileSecurityPage = lazy(() => import('@/app/(admin)/settings/profile-security/page'));

// Every settings page has admin-light: styles, so the panel follows the admin
// theme in the menu and in each sub-page.
const settingsOptions = [
  { title: 'Profile & Security', description: 'Your account and password.', icon: UserRoundCog, href: '/settings/profile-security', group: 'account', component: ProfileSecurityPage },
  { title: 'Fare Matrix', description: 'Set base fares and per-kilometer rates.', icon: Calculator, href: '/settings/fare-matrix', group: 'fares', component: FareMatrixPage },
  { title: 'Financial Rules', description: 'Wallet limits, discounts, loyalty.', icon: PiggyBank, href: '/settings/financial-rules', group: 'fares', component: FinancialRulesPage },
  { title: 'Voucher Generator', description: 'Generate bulk promo codes.', icon: Ticket, href: '/settings/voucher-generator', group: 'fares', component: VoucherGeneratorPage },
  { title: 'Receipt', description: 'Thermal fare-receipt content and printing.', icon: Printer, href: '/settings/receipt', group: 'fares', component: ReceiptPage },
  { title: 'Operations Rules', description: 'Speed limits, shifts, expenses.', icon: Gauge, href: '/settings/operations-rules', group: 'operations', component: OperationsRulesPage },
  { title: 'Safety & Notifications', description: 'Emergency contacts, push templates.', icon: Shield, href: '/settings/safety-notifications', group: 'operations', component: SafetyNotificationsPage },
  { title: 'FAQ Management', description: 'Manage commuter FAQ questions and answers.', icon: MessageCircleQuestion, href: '/settings/faq-management', group: 'app', component: FaqManagementPage },
  { title: 'App Configuration', description: 'Maintenance mode, registration.', icon: Settings2, href: '/settings/app-configuration', group: 'app', component: AppConfigurationPage },
] as const;

// The menu's sections, in order. Icons stay one neutral tone; the grouping
// and labels carry the structure instead of a colour per setting.
const settingsGroups = [
  { id: 'account', label: 'Account' },
  { id: 'fares', label: 'Fares & payments' },
  { id: 'operations', label: 'Operations & safety' },
  { id: 'app', label: 'App' },
] as const;

// True when `href` is a setting the drawer can open as a panel.
export function isSettingsPanelHref(href: string) {
  return settingsOptions.some(o => o.href === href);
}

// ─── Context ───
// The open sub-page (`activeHref`) lives here rather than in the drawer so
// callers outside it (dashboard Quick Links) can open a specific panel.
interface SettingsDrawerContextType {
  isSettingsOpen: boolean;
  activeHref: string | null;
  setActiveHref: (href: string | null) => void;
  openSettingsDrawer: () => void;
  openSettingsPanel: (href: string) => void;
  closeSettingsDrawer: () => void;
  toggleSettingsDrawer: () => void;
}

const SettingsDrawerContext = createContext<SettingsDrawerContextType>({
  isSettingsOpen: false,
  activeHref: null,
  setActiveHref: () => {},
  openSettingsDrawer: () => {},
  openSettingsPanel: () => {},
  closeSettingsDrawer: () => {},
  toggleSettingsDrawer: () => {},
});

export function SettingsDrawerProvider({ children }: { children: ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(null);

  // Opening from the nav always starts at the menu; closing resets it too.
  const openSettingsDrawer = useCallback(() => {
    setActiveHref(null);
    setIsSettingsOpen(true);
  }, []);
  const openSettingsPanel = useCallback((href: string) => {
    setActiveHref(isSettingsPanelHref(href) ? href : null);
    setIsSettingsOpen(true);
  }, []);
  const closeSettingsDrawer = useCallback(() => {
    setActiveHref(null);
    setIsSettingsOpen(false);
  }, []);
  const toggleSettingsDrawer = useCallback(() => {
    setActiveHref(null);
    setIsSettingsOpen(prev => !prev);
  }, []);

  const value = useMemo(
    () => ({ isSettingsOpen, activeHref, setActiveHref, openSettingsDrawer, openSettingsPanel, closeSettingsDrawer, toggleSettingsDrawer }),
    [isSettingsOpen, activeHref, openSettingsDrawer, openSettingsPanel, closeSettingsDrawer, toggleSettingsDrawer]
  );

  return (
    <SettingsDrawerContext.Provider value={value}>
      {children}
    </SettingsDrawerContext.Provider>
  );
}

export function useSettingsDrawer() {
  return useContext(SettingsDrawerContext);
}

// ─── Settings Nav Button ───
// Opens the settings drawer when clicked (used on direct-access settings pages).
export function SettingsNavButton() {
  const { toggleSettingsDrawer } = useSettingsDrawer();

  return (
    <button
      type="button"
      onClick={toggleSettingsDrawer}
      className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 admin-light:text-slate-500 hover:text-slate-100 admin-light:hover:text-slate-900 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Settings</span>
    </button>
  );
}

// ─── Loading Spinner ───
function DrawerLoader() {
  return (
    <div className="flex items-center justify-center h-full bg-[#0B1120] admin-light:bg-[#F1F5F9]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#62A0EA]/30 border-t-[#62A0EA] rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Loading…</p>
      </div>
    </div>
  );
}

// ─── Drawer Component ───
// The drawer has TWO internal views managed by React state (NO page navigation):
//   1. Menu view  – shows all 9 settings options
//   2. Sub-page view – renders the selected settings component directly (no iframe)
// Clicking "Go Back" in sub-page view returns to the menu view.
// The main page behind the drawer stays completely untouched.
//
// `docked` (desktop): the panel opens beside the 256px sidebar instead of
// from the right edge. It sits below the sidebar's z-40, so it slides out
// from behind it, and the backdrop leaves the sidebar undimmed and
// clickable. The menu is a narrow list; opening a setting widens the same
// panel over the page.
export function SettingsDrawer({ docked = false }: { docked?: boolean }) {
  const { isSettingsOpen, activeHref, setActiveHref, closeSettingsDrawer } = useSettingsDrawer();
  const [theme, setTheme] = useAdminTheme();
  const pathname = usePathname();

  // Close drawer + reset to menu (the context resets activeHref on close)
  const handleClose = closeSettingsDrawer;

  // Open a sub-page inside the drawer (no router.push — parent page stays put)
  const handleOptionClick = (href: string) => {
    setActiveHref(href);
  };

  // Go back from sub-page to menu (no navigation — just switch drawer view)
  const handleBack = () => {
    setActiveHref(null);
  };

  // Resolve the selected option for the header title + component
  const activeOption = useMemo(
    () => (activeHref ? settingsOptions.find(o => o.href === activeHref) : null),
    [activeHref]
  );

  const ActiveComponent = activeOption?.component ?? null;
  const isReceiptView = activeHref === '/settings/receipt';

  // left-64 / 16rem = the desktop sidebar's w-64.
  const panelPlacement = docked
    ? `top-0 left-64 z-30 h-dvh border-r ${
        !activeHref ? 'w-80' : isReceiptView ? 'w-[min(calc(100vw-16rem),64rem)]' : 'w-[min(calc(100vw-16rem),60rem)]'
      } ${isSettingsOpen ? 'translate-x-0' : '-translate-x-full'}`
    : `top-0 right-0 z-50 border-l ${isReceiptView ? 'h-dvh w-full sm:w-[90vw] lg:w-[min(90vw,64rem)]' : 'h-full w-[90vw] sm:w-[80vw] lg:w-1/2'} ${
        isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
      }`;

  return (
    <>
      {/* Backdrop — beside the sidebar when docked, so the nav stays usable */}
      <div
        className={`fixed inset-y-0 right-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          docked ? 'left-64 z-30' : 'left-0 z-40'
        } ${isSettingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
      />

      {/* Drawer Panel — beside the sidebar on desktop (docked), from the
          right edge on mobile (90%). */}
      <aside
        data-admin-theme={theme}
        inert={!isSettingsOpen}
        className={`
          fixed ${panelPlacement}
          bg-[#0D1424] admin-light:bg-white border-[#1E2D45] admin-light:border-[#E2E8F0] shadow-2xl shadow-black/40
          flex flex-col
          transform transition-transform duration-300 ease-out
        `}
      >
        {/* ── Header ── title over a one-line context: what the panel holds
            on the menu, what the open setting controls in a sub-page. */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#1E2D45] admin-light:border-[#E2E8F0] px-5">
          <div className="flex min-w-0 items-center gap-2">
            {/* Back arrow — only visible in sub-page view */}
            {activeHref && (
              <button
                onClick={handleBack}
                aria-label="Back to Settings"
                className="-ml-1.5 shrink-0 rounded-md p-1.5 text-slate-400 admin-light:text-slate-500 transition-colors hover:bg-[#131C2E] admin-light:hover:bg-[#F1F5F9] hover:text-white admin-light:hover:text-slate-900 active:scale-95"
                title="Back to Settings menu"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold leading-tight text-white admin-light:text-slate-900">
                {activeOption ? activeOption.title : 'Settings'}
              </h2>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {activeOption ? activeOption.description : 'System rules and configuration'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close Settings"
            className="shrink-0 rounded-md p-2 text-slate-400 admin-light:text-slate-500 transition-colors hover:bg-[#131C2E] admin-light:hover:bg-[#F1F5F9] hover:text-white admin-light:hover:text-slate-900 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── View 1: Settings Menu ── grouped hairline rows. Every icon is
            the same neutral grey; only the active setting picks up blue. */}
        {!activeHref && (
          <nav aria-label="Settings" className="flex-1 overflow-y-auto py-4">
            {settingsGroups.map((group) => (
              <section key={group.id} aria-labelledby={`settings-group-${group.id}`} className="mb-5 last:mb-0">
                <h3 id={`settings-group-${group.id}`} className="mb-1 px-5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </h3>
                <ul className="divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
                  {settingsOptions.filter((item) => item.group === group.id).map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <button
                          type="button"
                          onClick={() => handleOptionClick(item.href)}
                          aria-current={active ? 'page' : undefined}
                          className={`group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] ${
                            active
                              ? 'bg-[#62A0EA]/10 admin-light:bg-[#1A5FB4]/10'
                              : 'hover:bg-[#131C2E] admin-light:hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <Icon
                            size={16}
                            aria-hidden="true"
                            className={`shrink-0 transition-colors ${
                              active
                                ? 'text-[#62A0EA] admin-light:text-[#1A5FB4]'
                                : 'text-slate-500 admin-light:text-slate-600 group-hover:text-slate-300 admin-light:group-hover:text-slate-900'
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-medium ${
                              active
                                ? 'text-[#62A0EA] admin-light:text-[#1A5FB4]'
                                : 'text-slate-200 admin-light:text-slate-800 group-hover:text-white admin-light:group-hover:text-slate-900'
                            }`}>
                              {item.title}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-slate-500">{item.description}</span>
                          </span>
                          <ChevronRight
                            size={16}
                            aria-hidden="true"
                            className="shrink-0 text-slate-600 admin-light:text-slate-500 transition-[color,translate] duration-150 group-hover:translate-x-0.5 group-hover:text-slate-400 admin-light:group-hover:text-slate-700 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                          />
                        </button>
                      </li>
                    );
                  })}
                  {group.id === 'app' && (
                    <li>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={theme === 'dark'}
                        aria-label="Dark mode"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-[#131C2E] admin-light:hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]"
                      >
                        <Moon
                          size={16}
                          aria-hidden="true"
                          className="shrink-0 text-slate-500 admin-light:text-slate-600 group-hover:text-slate-300 admin-light:group-hover:text-slate-900"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-200 admin-light:text-slate-800 group-hover:text-white admin-light:group-hover:text-slate-900">Dark mode</span>
                          <span className="mt-0.5 block truncate text-[11px] text-slate-500">Switch between dark and light appearance.</span>
                        </span>
                        <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${theme === 'dark' ? 'bg-[#62A0EA]' : 'bg-slate-600 admin-light:bg-slate-300'}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                        </span>
                      </button>
                    </li>
                  )}
                </ul>
              </section>
            ))}
          </nav>
        )}

        {/* ── View 2: Sub-page Content (rendered directly, no iframe) ── */}
        {activeHref && ActiveComponent && (
          // pt-6: every settings page's wrapper is pb-only, so without this the
          // page title sat flush against the drawer's header bar.
          <div key={activeHref} className={`min-h-0 flex-1 bg-[#0B1120] admin-light:bg-[#F1F5F9] overflow-y-auto ${isReceiptView ? '' : 'pt-6'}`}>
            <Suspense fallback={activeHref === '/settings/fare-matrix' ? <SkeletonFareMatrix /> : <DrawerLoader />}>
              <ActiveComponent />
            </Suspense>
          </div>
        )}
      </aside>
    </>
  );
}
