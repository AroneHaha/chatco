// components/admin/ui/settings-drawer.tsx
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, Sliders, ArrowLeft } from 'lucide-react';

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

// ─── Drawer Component (simplified — no lazy settings pages) ───
export function SettingsDrawer() {
  const { isSettingsOpen, closeSettingsDrawer } = useSettingsDrawer();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isSettingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSettingsDrawer}
      />

      {/* Drawer Panel */}
      <aside
        className={`
          fixed top-0 right-0 z-50 h-full w-[90vw] sm:w-[80vw] lg:w-1/2
          bg-[#0D1424] border-l border-[#1E2D45] shadow-2xl shadow-black/40
          flex flex-col
          transform transition-transform duration-300 ease-out
          ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#1E2D45] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-[#62A0EA]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-widest">Settings</h2>
          </div>
          <button
            onClick={closeSettingsDrawer}
            className="p-2 rounded-lg hover:bg-[#131C2E] text-slate-400 hover:text-white transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content placeholder */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm text-slate-500">Settings pages will be loaded here.</p>
        </div>
      </aside>
    </>
  );
}
