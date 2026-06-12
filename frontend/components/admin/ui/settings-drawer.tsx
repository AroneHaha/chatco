// components/admin/ui/settings-drawer.tsx
'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, Suspense, lazy, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  X, Calculator, MapPin, Wallet, PiggyBank, Ticket, Gauge,
  Shield, MessageCircleQuestion, Settings2, Sliders, ArrowLeft
} from 'lucide-react';

// ─── Lazy-loaded settings page components ───
// Instead of iframes (which lose the session cookie and redirect to /login),
// we import the page components directly and render them inside the drawer.
// This eliminates all iframe/cookie/auth issues.

const FareMatrixPage = lazy(() => import('@/app/(admin)/settings/fare-matrix/page'));
const RoutesPage = lazy(() => import('@/app/(admin)/settings/routes/page'));
const RemittanceOptionsPage = lazy(() => import('@/app/(admin)/settings/remittance-options/page'));
const FinancialRulesPage = lazy(() => import('@/app/(admin)/settings/financial-rules/page'));
const VoucherGeneratorPage = lazy(() => import('@/app/(admin)/settings/voucher-generator/page'));
const OperationsRulesPage = lazy(() => import('@/app/(admin)/settings/operations-rules/page'));
const SafetyNotificationsPage = lazy(() => import('@/app/(admin)/settings/safety-notifications/page'));
const FaqManagementPage = lazy(() => import('@/app/(admin)/settings/faq-management/page'));
const AppConfigurationPage = lazy(() => import('@/app/(admin)/settings/app-configuration/page'));

const settingsOptions = [
  { title: 'Fare Matrix', description: 'Set base fares and per-kilometer rates.', icon: Calculator, href: '/settings/fare-matrix', color: 'text-blue-400', bgColor: 'bg-blue-500/15', component: FareMatrixPage },
  { title: 'Routes', description: 'Define and edit route waypoints.', icon: MapPin, href: '/settings/routes', color: 'text-green-400', bgColor: 'bg-green-500/15', component: RoutesPage },
  { title: 'Remittance Options', description: 'Manage conductor remittance recipients.', icon: Wallet, href: '/settings/remittance-options', color: 'text-purple-400', bgColor: 'bg-purple-500/15', component: RemittanceOptionsPage },
  { title: 'Financial Rules', description: 'Wallet limits, discounts, loyalty.', icon: PiggyBank, href: '/settings/financial-rules', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15', component: FinancialRulesPage },
  { title: 'Voucher Generator', description: 'Generate bulk promo codes.', icon: Ticket, href: '/settings/voucher-generator', color: 'text-pink-400', bgColor: 'bg-pink-500/15', component: VoucherGeneratorPage },
  { title: 'Operations Rules', description: 'Speed limits, shifts, expenses.', icon: Gauge, href: '/settings/operations-rules', color: 'text-orange-400', bgColor: 'bg-orange-500/15', component: OperationsRulesPage },
  { title: 'Safety & Notifications', description: 'Emergency contacts, push templates.', icon: Shield, href: '/settings/safety-notifications', color: 'text-red-400', bgColor: 'bg-red-500/15', component: SafetyNotificationsPage },
  { title: 'FAQ Management', description: 'Manage commuter FAQ questions and answers.', icon: MessageCircleQuestion, href: '/settings/faq-management', color: 'text-[#62A0EA]', bgColor: 'bg-[#62A0EA]/15', component: FaqManagementPage },
  { title: 'App Configuration', description: 'Maintenance mode, registration.', icon: Settings2, href: '/settings/app-configuration', color: 'text-slate-300', bgColor: 'bg-slate-500/15', component: AppConfigurationPage },
];

// ─── Context ───
interface SettingsDrawerContextType {
  isSettingsOpen: boolean;
  openSettingsDrawer: () => void;
  closeSettingsDrawer: () => void;
  toggleSettingsDrawer: () => void;
}

const SettingsDrawerContext = createContext<SettingsDrawerContextType>({
  isSettingsOpen: false,
  openSettingsDrawer: () => {},
  closeSettingsDrawer: () => {},
  toggleSettingsDrawer: () => {},
});

export function SettingsDrawerProvider({ children }: { children: ReactNode }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const openSettingsDrawer = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettingsDrawer = useCallback(() => setIsSettingsOpen(false), []);
  const toggleSettingsDrawer = useCallback(() => setIsSettingsOpen(prev => !prev), []);

  return (
    <SettingsDrawerContext.Provider value={{ isSettingsOpen, openSettingsDrawer, closeSettingsDrawer, toggleSettingsDrawer }}>
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
      className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Settings</span>
    </button>
  );
}

// ─── Loading Spinner ───
function DrawerLoader() {
  return (
    <div className="flex items-center justify-center h-full bg-[#0B1120]">
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
export function SettingsDrawer() {
  const { isSettingsOpen, closeSettingsDrawer } = useSettingsDrawer();
  const pathname = usePathname();
  const [activeHref, setActiveHref] = useState<string | null>(null);

  // Reset to menu whenever the drawer closes
  useEffect(() => {
    if (!isSettingsOpen) {
      setActiveHref(null);
    }
  }, [isSettingsOpen]);

  // Close drawer + reset to menu
  const handleClose = () => {
    setActiveHref(null);
    closeSettingsDrawer();
  };

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isSettingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Drawer Panel — 90% on mobile, 50% on desktop, slides from RIGHT */}
      <aside
        className={`
          fixed top-0 right-0 z-50 h-full w-[90vw] sm:w-[80vw] lg:w-1/2
          bg-[#0D1424] border-l border-[#1E2D45] shadow-2xl shadow-black/40
          flex flex-col
          transform transition-transform duration-300 ease-out
          ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#1E2D45] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Back arrow — only visible in sub-page view */}
            {activeHref && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-[#131C2E] text-slate-400 hover:text-white transition-colors active:scale-95"
                title="Back to Settings menu"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <Sliders size={18} className="text-[#62A0EA]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-widest">
              {activeOption ? activeOption.title : 'Settings'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[#131C2E] text-slate-400 hover:text-white transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── View 1: Settings Menu ── */}
        {!activeHref && (
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {settingsOptions.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => handleOptionClick(item.href)}
                  className={`
                    w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg
                    transition-all duration-150 group
                    ${active
                      ? 'bg-[#62A0EA]/10'
                      : 'hover:bg-[#131C2E]'}
                  `}
                >
                  <div className={`p-2 rounded-lg flex-shrink-0 ${item.bgColor}`}>
                    <Icon size={16} className={item.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${active ? 'text-[#62A0EA]' : 'text-slate-200 group-hover:text-white'}`}>{item.title}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        )}

        {/* ── View 2: Sub-page Content (rendered directly, no iframe) ── */}
        {activeHref && ActiveComponent && (
          <div key={activeHref} className="flex-1 bg-[#0B1120] overflow-y-auto">
            <Suspense fallback={<DrawerLoader />}>
              <ActiveComponent />
            </Suspense>
          </div>
        )}
      </aside>
    </>
  );
}