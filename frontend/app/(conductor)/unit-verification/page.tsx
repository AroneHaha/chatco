"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, LogOut } from "lucide-react";
import { mdiJeepney } from "@mdi/js";
import { startShift } from "@/lib/conductor/services/shift.service";
import type { ConductorDriver, ConductorUnit } from "@/lib/conductor/types";
import { useUnitVerification } from "@/app/(conductor)/hooks/use-unit-verification";
import { useConductorShift } from "@/app/(conductor)/hooks/use-conductor-shift";
import UnitList from "@/components/conductor/unit-verification/UnitList";
import DriverList from "@/components/conductor/unit-verification/DriverList";
import StartShiftModal from "@/components/conductor/unit-verification/StartShiftModal";
import { UnitVerificationSkeleton } from "@/components/conductor/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useLightModeToggle } from "@/contexts/commuter-theme-context";
import { ThemeToggleIcons } from "@/components/commuter/profile/profile-theme-toggle";

type Step = "select-unit" | "select-driver";

export default function ConductorLoginPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { profile, units, drivers, status, error, refresh } = useUnitVerification();
  const { shift, status: shiftStatus, refresh: refreshShift } = useConductorShift();
  const [isLight, setIsLight] = useLightModeToggle();

  const [step, setStep] = useState<Step>("select-unit");
  const [selectedUnit, setSelectedUnit] = useState<ConductorUnit | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<ConductorDriver | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Reason shown when an unavailable unit/driver is tapped — the same text
  // the backend would refuse the shift with.
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isCheckingShift, setIsCheckingShift] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Reuse the shift already fetched by ConductorShiftProvider (wraps the
  // whole (conductor) route group) instead of calling fetchActiveShift()
  // again here — this page used to fire a redundant duplicate request.
  useEffect(() => {
    if (shiftStatus === "loading") return;

    if (shift) {
      router.replace("/conductor-dashboard");
      return;
    }

    setIsCheckingShift(false);
  }, [shift, shiftStatus, router]);

  if (isCheckingShift || status === "loading") {
    return <UnitVerificationSkeleton />;
  }

  const handleSelectUnit = (unit: ConductorUnit) => {
    setSelectionError(null);
    setSelectedUnit(unit);
    setStep("select-driver");
  };

  const handleSelectDriver = (driver: ConductorDriver) => {
    setSelectionError(null);
    setSubmitError(null);
    setSelectedDriver(driver);
    setShowConfirmModal(true);
  };

  const handleUnavailable = (item: ConductorUnit | ConductorDriver) => {
    setSelectionError(item.unavailableReason ?? "This option can't be used for a shift right now.");
  };

  const goBack = () => {
    if (step === "select-driver") {
      setSelectionError(null);
      setSelectedDriver(null);
      setStep("select-unit");
    }
  };

  const handleConfirmShift = async () => {
    if (!selectedUnit || !selectedDriver || !profile) return;

    setIsProcessing(true);
    setSubmitError(null);

    try {
      await startShift({
        unitId: selectedUnit.id,
        driverId: selectedDriver.id,
        routeId: selectedUnit.routeId,
      });
      // Sync the shared shift context before navigating — it's still
      // holding the pre-shift "empty" status from this page's own load,
      // and the dashboard's guard redirects back to unit-verification if
      // it mounts before that's corrected.
      await refreshShift();
      router.push("/conductor-dashboard");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Unable to start shift. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    await logout();
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#050F1A] light:bg-gray-50 flex flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col px-4 py-4 sm:py-6 max-w-md lg:max-w-lg mx-auto w-full">
        <div className="mb-6 flex shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/logo-transparent.png" alt="" width={40} height={40} className="shrink-0" priority />
            <div className="min-w-0">
              <p className="text-2xl font-extrabold text-white light:text-gray-900 tracking-tight">
                CHATCO<span className="text-[#62A0EA] light:text-[#1A5FB4]">.</span>
              </p>
              <p className="text-[10px] text-slate-500 light:text-gray-500 uppercase tracking-[0.2em] font-semibold mt-1">
                Conductor Portal
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Same light/dark preference and Moon/Sun swap as the profile
                toggle, on every screen size, in this page's solid button style. */}
            <button
              type="button"
              onClick={() => setIsLight(!isLight)}
              aria-label="Toggle dark and light mode"
              aria-pressed={isLight}
              title={isLight ? "Light mode · Switch to dark mode" : "Dark mode · Switch to light mode"}
              className="relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#1C3350] light:border-gray-200 bg-[#0B1E33] light:bg-white text-slate-300 light:text-gray-700 transition-colors hover:bg-[#10273F] light:hover:bg-gray-100 hover:text-white light:hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5FB4]"
            >
              <ThemeToggleIcons isLight={isLight} size={18} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[#1C3350] light:border-gray-200 bg-[#0B1E33] light:bg-white px-3 text-xs font-semibold text-slate-300 light:text-gray-700 transition-colors hover:bg-[#10273F] light:hover:bg-gray-100 hover:text-white light:hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={15} />
              {isLoggingOut ? "Signing out" : "Sign out"}
            </button>
          </div>
        </div>

        {status === "error" && error && (
          <div className="mb-4 rounded-xl border border-[#5C1F27] light:border-red-200 bg-[#2B1116] light:bg-red-50 px-4 py-3 text-center">
            <p className="text-sm text-red-300 light:text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-2 text-xs font-semibold text-red-200 light:text-red-700 hover:text-white light:hover:text-gray-900 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {status === "empty" && (
          <div className="rounded-xl border border-[#1C3350] light:border-gray-200 bg-[#0B1E33] light:bg-white px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-200 light:text-gray-800">No units available</p>
            <p className="text-xs text-slate-400 light:text-gray-600 mt-2 leading-relaxed">
              Active units will appear here when they are not assigned to another conductor or already on shift.
            </p>
          </div>
        )}

        {step === "select-unit" && units.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col animate-fade-in">
            <div className="mb-4 shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 light:text-gray-500">Step 1 of 2</p>
              <h1 className="mt-1 text-xl font-bold text-white light:text-gray-900">Select your unit</h1>
              <p className="mt-1 text-sm text-slate-400 light:text-gray-600">
                Choose the vehicle unit assigned to you for this shift.
              </p>
            </div>
            {selectionError && (
              <p role="alert" className="mb-3 shrink-0 rounded-xl border border-[#5C1F27] light:border-red-200 bg-[#2B1116] light:bg-red-50 px-4 py-2.5 text-xs font-medium text-red-300 light:text-red-700">
                {selectionError}
              </p>
            )}
            <UnitList units={units} onSelect={handleSelectUnit} onUnavailable={handleUnavailable} />
          </div>
        )}

        {step === "select-driver" && (
          <div className="flex min-h-0 flex-1 flex-col animate-fade-in">
            <div className="mb-4 flex shrink-0 items-start gap-3">
              <button
                type="button"
                onClick={goBack}
                aria-label="Back to unit selection"
                className="mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#1C3350] light:border-gray-200 bg-[#0B1E33] light:bg-white text-slate-300 light:text-gray-700 transition-colors hover:bg-[#10273F] light:hover:bg-gray-100 hover:text-white light:hover:text-gray-900 active:scale-95"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 light:text-gray-500">Step 2 of 2</p>
                <h1 className="mt-1 text-xl font-bold text-white light:text-gray-900">Select your driver</h1>
                <p className="mt-1 text-sm text-slate-400 light:text-gray-600">
                  Choose the driver you will be assisting for today&apos;s shift.
                </p>
              </div>
            </div>

            {selectedUnit && (
              <div className="mb-4 flex shrink-0 items-center gap-3 border-y border-[#1C3350] light:border-gray-200 py-3">
                <svg className="h-8 w-8 shrink-0 text-[#62A0EA] light:text-[#1A5FB4]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={mdiJeepney} />
                </svg>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 light:text-gray-500">Your unit</p>
                  <p className="text-sm font-semibold text-white light:text-gray-900">
                    {selectedUnit.unitNumber}
                    <span className="ml-2 font-medium text-slate-400 light:text-gray-600">{selectedUnit.plateNumber}</span>
                  </p>
                </div>
              </div>
            )}

            {drivers.length === 0 ? (
              <div className="rounded-xl border border-[#1C3350] light:border-gray-200 bg-[#0B1E33] light:bg-white px-6 py-8 text-center">
                <p className="text-sm font-semibold text-slate-200 light:text-gray-800">No drivers available</p>
                <p className="text-xs text-slate-400 light:text-gray-600 mt-2">
                  Driver assignments will appear here once the backend connection is active.
                </p>
              </div>
            ) : (
              <>
                {selectionError && (
                  <p role="alert" className="mb-3 shrink-0 rounded-xl border border-[#5C1F27] light:border-red-200 bg-[#2B1116] light:bg-red-50 px-4 py-2.5 text-xs font-medium text-red-300 light:text-red-700">
                    {selectionError}
                  </p>
                )}
                <DriverList drivers={drivers} onSelect={handleSelectDriver} onUnavailable={handleUnavailable} />
              </>
            )}
          </div>
        )}
      </div>

      <StartShiftModal
        show={showConfirmModal}
        unit={selectedUnit}
        driver={selectedDriver}
        conductorName={profile?.name ?? "Conductor"}
        isProcessing={isProcessing}
        error={submitError}
        onConfirm={handleConfirmShift}
        onCancel={() => { setShowConfirmModal(false); setSubmitError(null); }}
      />

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
