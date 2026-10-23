// Class sets for commuter and conductor dialogs that draw their own panel
// (they don't use the shared <Modal>). Dark-first with `light:` overrides, per
// the UI rules: solid surfaces, CHATCO Blue for primary, red only for SOS,
// errors and destructive actions, and icons placed bare (no tile behind them).
export const APP_DIALOG = {
  overlay: "fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm",
  panel: "relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-y-auto rounded-xl border border-[#1C3350] bg-[#0B1E33] text-white shadow-2xl light:border-gray-200 light:bg-white light:text-gray-900",
  close: "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-[#10273F] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] light:text-gray-400 light:hover:bg-gray-100 light:hover:text-gray-900",
  title: "text-lg font-semibold leading-snug text-white light:text-gray-900",
  muted: "text-white/60 light:text-gray-500",
  label: "text-[11px] font-semibold uppercase tracking-widest text-white/50 light:text-gray-500",
  hairline: "border-[#1C3350] light:border-gray-200",
  divide: "divide-[#1C3350] light:divide-gray-200",
  field: "border border-[#1C3350] bg-[#071A2E] light:border-gray-200 light:bg-gray-50",
  button: "flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] disabled:cursor-not-allowed disabled:opacity-50",
  primary: "border-[#1A5FB4] bg-[#1A5FB4] text-white hover:border-[#164A8F] hover:bg-[#164A8F]",
  secondary: "border-[#1C3350] bg-[#10273F] text-white hover:bg-[#143150] light:border-gray-300 light:bg-white light:text-gray-800 light:hover:bg-gray-50",
  danger: "border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700",
  /** Secondary surface with red text, for a destructive action that isn't the main one. */
  dangerSecondary: "border-[#1C3350] bg-[#10273F] text-[#F07171] hover:bg-[#143150] light:border-gray-300 light:bg-white light:text-red-600 light:hover:bg-gray-50",
  blueIcon: "text-[#62A0EA] light:text-[#1A5FB4]",
  redIcon: "text-[#F07171] light:text-red-600",
  redText: "text-[#F07171] light:text-red-600",
} as const;
