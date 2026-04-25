"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getActiveShift, clearShift } from "@/lib/conductor-shift";
import { getRemittanceHistory } from "@/lib/remittance-history";
import type { ConductorShift } from "@/lib/conductor-shift";
import ClearCacheModal from "@/components/conductor/modals/clear-cache-modal";
import SosConfirmModal from "@/components/conductor/modals/sos-confirm-modal";

export default function SettingsPage() {
  const router = useRouter();
  const [shift, setShift] = useState<ConductorShift | null>(null);
  const [scanSound, setScanSound] = useState(true);

  const [showClearCache, setShowClearCache] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

  useEffect(() => {
    setShift(getActiveShift());
  }, []);

  const logoutLocked = useMemo(() => {
    if (!shift) return false;
    const history = getRemittanceHistory();
    const record = history.find((r) => r.shiftId === shift.shiftId);
    if (!record) return false;
    return record.totalCashless > 0 && record.remittanceStatus === "Pending";
  }, [shift]);

  const handleClearCache = () => {
    localStorage.removeItem("conductor_app_cache");
    localStorage.removeItem("leaflet_tile_cache");
    setShowClearCache(false);
  };

  const handleLogout = () => {
    clearShift();
    router.push("/conductor-login");
  };

  return (
    <div className="min-h-screen bg-[#050F1A] pb-24 lg:pb-8 lg:pl-64">
      <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        {/* ===== Page Header ===== */}
        <div>
          <h1 className="text-white font-bold text-xl lg:text-2xl">Settings</h1>
          <p className="text-white/40 text-sm mt-1">
            Manage your app preferences and account
          </p>
        </div>

        {/* ===== Profile Section ===== */}
        <section className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase tracking-wider font-semibold text-white/40">
              Profile
            </h2>
            <div className="flex items-center gap-1.5 text-white/25">
              <span className="text-[11px]">🔒</span>
              <span className="text-[10px] font-medium">Managed by Admin</span>
            </div>
          </div>

          <div className="space-y-3">
            {(
              [
                { label: "Name", value: shift?.conductorName || "—" },
                { label: "Username", value: "mark_conductor" },
                { label: "Phone Number", value: "+63 917 123 4567" },
              ] as const
            ).map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3"
              >
                <span className="text-xs text-white/40 font-medium">
                  {item.label}
                </span>
                <span className="text-sm text-white font-semibold">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Active Assignment ===== */}
        <section className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 lg:p-6">
          <h2 className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-4">
            Active Assignment
          </h2>

          {shift ? (
            <div className="space-y-3">
              {(
                [
                  { label: "Current Unit", value: shift.unitNumber },
                  { label: "Assigned Driver", value: shift.driverName },
                  { label: "Route", value: shift.route },
                ] as const
              ).map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3"
                >
                  <span className="text-xs text-white/40 font-medium">
                    {item.label}
                  </span>
                  <span className="text-sm text-white font-semibold">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-white/15"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                  />
                </svg>
              </div>
              <p className="text-sm text-white/25 font-medium">No active shift</p>
              <p className="text-xs text-white/15 mt-1">
                Start a shift to see assignment details
              </p>
            </div>
          )}
        </section>

        {/* ===== App Preferences ===== */}
        <section className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 lg:p-6">
          <h2 className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-4">
            App Preferences
          </h2>

          <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5">
            <div>
              <p className="text-sm text-white font-semibold">Scan Sound</p>
              <p className="text-xs text-white/30 mt-0.5">
                Play sound on successful scan
              </p>
            </div>
            <button
              onClick={() => setScanSound(!scanSound)}
              className={`relative w-12 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${
                scanSound ? "bg-[#1A5FB4]" : "bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md transition-transform duration-300 ${
                  scanSound ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </section>

        {/* ===== Account & Security ===== */}
        <section className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 lg:p-6">
          <h2 className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-4">
            Account & Security
          </h2>

          <div className="space-y-3">
            {/* Change Password */}
            <button
              disabled
              className="w-full flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 opacity-40 cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white/25"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm text-white font-semibold">
                    Change Password
                  </p>
                  <p className="text-xs text-white/25 mt-0.5">
                    Update your account password
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/15 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.04]">
                Soon
              </span>
            </button>

            {/* Push Notifications */}
            <button
              disabled
              className="w-full flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 opacity-40 cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white/25"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm text-white font-semibold">
                    Push Notifications
                  </p>
                  <p className="text-xs text-white/25 mt-0.5">
                    Manage notification preferences
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/15 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.04]">
                Soon
              </span>
            </button>
          </div>
        </section>

        {/* ===== Emergency SOS ===== */}
        <section className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-4 lg:p-6">
          <h2 className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-4">
            Emergency
          </h2>

          <button
            onClick={() => setShowSOS(true)}
            className="w-full flex items-center gap-4 bg-red-500/[0.06] border border-red-500/15 hover:bg-red-500/[0.12] hover:border-red-500/25 rounded-2xl px-5 py-5 transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-7 h-7 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-red-400">
                Emergency SOS
              </p>
              <p className="text-xs text-red-400/40 mt-0.5">
                Send an emergency alert to dispatch
              </p>
            </div>
          </button>
        </section>

        {/* ===== Danger Zone (Cache Only) ===== */}
        <section className="bg-[#071A2E] border border-red-500/20 rounded-2xl p-4 lg:p-6">
          <h2 className="text-[10px] uppercase tracking-wider font-semibold text-red-400/50 mb-4">
            Data & Storage
          </h2>

          <button
            onClick={() => setShowClearCache(true)}
            className="w-full flex items-center justify-between bg-red-500/[0.03] border border-red-500/10 hover:bg-red-500/[0.07] hover:border-red-500/20 rounded-xl px-4 py-3.5 transition-all active:scale-[0.99]"
          >
            <div className="text-left">
              <p className="text-sm text-red-400/70 font-semibold">
                Clear App Cache
              </p>
              <p className="text-xs text-white/20 mt-0.5">
                Free up space by removing temporary cached data
              </p>
            </div>
            <svg
              className="w-4 h-4 text-red-400/30 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
          </button>
        </section>

        {/* ===== Logout (Bottom of scroll for both Mobile & Desktop) ===== */}
        <div className="pt-6 border-t border-white/[0.06]">
          {logoutLocked && (
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <svg
                className="w-3 h-3 text-amber-400/70 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
              <p className="text-xs text-amber-400/70 font-medium">
                Remit your collected cashless amount before logging out.
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={logoutLocked}
            className="w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/15 rounded-xl px-4 py-3 transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <svg
              className="w-4 h-4 text-white/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
            <span className="text-sm font-semibold text-white/50">
              Log Out
            </span>
          </button>
        </div>
      </div>

      {/* ===== EXTRACTED MODALS ===== */}
      <ClearCacheModal
        isOpen={showClearCache}
        onClose={() => setShowClearCache(false)}
        onConfirm={handleClearCache}
      />
      <SosConfirmModal
        isOpen={showSOS}
        onClose={() => setShowSOS(false)}
        onConfirm={() => setShowSOS(false)}
      />
    </div>
  );
}