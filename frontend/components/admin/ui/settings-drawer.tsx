// components/admin/ui/settings-drawer.tsx
'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  X, Calculator, MapPin, Wallet, PiggyBank, Ticket, Gauge,
  Shield, MessageCircleQuestion, Settings2, Sliders, ArrowLeft
} from 'lucide-react';

const settingsOptions = [
  { title: 'Fare Matrix', description: 'Set base fares and per-kilometer rates.', icon: Calculator, href: '/settings/fare-matrix', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  { title: 'Routes', description: 'Define and edit route waypoints.', icon: MapPin, href: '/settings/routes', color: 'text-green-400', bgColor: 'bg-green-500/15' },
  { title: 'Remittance Options', description: 'Manage conductor remittance recipients.', icon: Wallet, href: '/settings/remittance-options', color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  { title: 'Financial Rules', description: 'Wallet limits, discounts, loyalty.', icon: PiggyBank, href: '/settings/financial-rules', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' },
  { title: 'Voucher Generator', description: 'Generate bulk promo codes.', icon: Ticket, href: '/settings/voucher-generator', color: 'text-pink-400', bgColor: 'bg-pink-500/15' },
  { title: 'Operations Rules', description: 'Speed limits, shifts, expenses.', icon: Gauge, href: '/settings/operations-rules', color: 'text-orange-400', bgColor: 'bg-orange-500/15' },
  { title: 'Safety & Notifications', description: 'Emergency contacts, push templates.', icon: Shield, href: '/settings/safety-notifications', color: 'text-red-400', bgColor: 'bg-red-500/15' },
  { title: 'FAQ Management', description: 'Manage commuter AI assistant Q&A.', icon: MessageCircleQuestion, href: '/settings/faq-management', color: 'text-[#62A0EA]', bgColor: 'bg-[#62A0EA]/15' },
  { title: 'App Configuration', description: 'Maintenance mode, registration.', icon: Settings2, href: '/settings/app-configuration', color: 'text-slate-300', bgColor: 'bg-slate-500/15' },
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

// ─── Settings Nav Button (replaces BackButton on settings sub-pages) ───
// When inside the drawer iframe (?embed=1), this button is hidden
// because the drawer has its own back arrow in the header.
export function SettingsNavButton() {
  const { toggleSettingsDrawer } = useSettingsDrawer();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get('embed') === '1';

  if (isEmbed) return null;

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

// ─── Drawer Component ───
// The drawer has TWO internal views managed by React state (NO page navigation):
//   1. Menu view  – shows all 9 settings options
//   2. Sub-page view – loads the selected settings sub-page inside an iframe
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

  // Resolve the selected option for the header title
  const activeOption = activeHref ? settingsOptions.find(o => o.href === activeHref) : null;

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

        {/* ── View 2: Sub-page Content (loaded via iframe) ── */}
        {activeHref && (
          <div key={activeHref} className="flex-1 bg-[#0B1120] overflow-hidden relative">
            {/* Loading shimmer while iframe loads */}
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0B1120] pointer-events-none transition-opacity duration-300" id="drawer-iframe-loader">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#62A0EA]/30 border-t-[#62A0EA] rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Loading…</p>
              </div>
            </div>
            <iframe
              src={`${activeHref}?embed=1`}
              className="w-full h-full border-0"
              title={activeOption?.title || 'Settings'}
              onLoad={() => {
                // Hide the loading spinner once the iframe has finished loading
                const loader = document.getElementById('drawer-iframe-loader');
                if (loader) {
                  (loader as HTMLElement).style.opacity = '0';
                  setTimeout(() => {
                    (loader as HTMLElement).style.display = 'none';
                  }, 300);
                }
              }}
            />
          </div>
        )}
      </aside>
    </>
  );
}