"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startShift, fetchActiveShift } from "@/lib/conductor/services/shift.service";
import type { ConductorDriver, ConductorUnit } from "@/lib/conductor/types";
import { useUnitVerification } from "@/app/(conductor)/hooks/use-unit-verification";
import UnitList from "@/components/conductor/unit-verification/UnitList";
import DriverList from "@/components/conductor/unit-verification/DriverList";
import StartShiftModal from "@/components/conductor/unit-verification/StartShiftModal";
import { UnitVerificationSkeleton } from "@/components/conductor/ui/skeleton";

type Step = "select-unit" | "select-driver";

export default function ConductorLoginPage() {
  const router = useRouter();
  const { profile, units, drivers, status, error, refresh } = useUnitVerification();

  const [step, setStep] = useState<Step>("select-unit");
  const [selectedUnit, setSelectedUnit] = useState<ConductorUnit | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<ConductorDriver | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCheckingShift, setIsCheckingShift] = useState(true);

  useEffect(() => {
    void fetchActiveShift().then((shift) => {
      if (shift) {
        router.replace("/conductor-dashboard");
      } else {
        setIsCheckingShift(false);
      }
    });
  }, [router]);

  if (isCheckingShift || status === "loading") {
    return <UnitVerificationSkeleton />;
  }

  const handleSelectUnit = (unit: ConductorUnit) => {
    setSelectedUnit(unit);
    setStep("select-driver");
  };

  const handleSelectDriver = (driver: ConductorDriver) => {
    setSelectedDriver(driver);
    setShowConfirmModal(true);
  };

  const goBack = () => {
    if (step === "select-driver") {
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
      router.push("/conductor-dashboard");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Unable to start shift. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050F1A] flex flex-col">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-[#1A5FB4]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative flex-1 flex flex-col justify-center px-4 py-10 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            CHATCO<span className="text-[#62A0EA]">.</span>
          </h1>
          <p className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-semibold mt-1">
            Conductor Portal
          </p>
        </div>

        {status === "error" && error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={() => void refresh()}
              className="mt-2 text-xs font-semibold text-red-200 hover:text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {status === "empty" && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-6 py-10 text-center">
            <p className="text-sm font-semibold text-white/70">No units available</p>
            <p className="text-xs text-white/35 mt-2 leading-relaxed">
              Assigned units will appear here once the backend connection is active.
            </p>
          </div>
        )}

        {step === "select-unit" && units.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center space-y-2 mb-6">
              <h1 className="text-white font-bold text-xl">Select Your Unit</h1>
              <p className="text-white/40 text-xs leading-relaxed max-w-xs mx-auto">
                Choose the vehicle unit assigned to you for this shift.
              </p>
            </div>
            <UnitList units={units} onSelect={handleSelectUnit} />
          </div>
        )}

        {step === "select-driver" && (
          <div className="space-y-4 animate-fade-in">
            <button
              onClick={goBack}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95 mb-4"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>

            <div className="text-center space-y-2 mb-6">
              <h1 className="text-white font-bold text-xl">Select Your Driver</h1>
              <p className="text-white/40 text-xs leading-relaxed max-w-xs mx-auto">
                Choose the driver you will be assisting for today&apos;s shift.
              </p>
            </div>

            {selectedUnit && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#1A5FB4]/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4.5 h-4.5 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H6.375c-.621 0-1.125-.504-1.125-1.125V14.25m17.25 4.5V14.25A2.25 2.25 0 0 0 20.25 12H3.75A2.25 2.25 0 0 0 1.5 14.25v4.5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{selectedUnit.unitNumber}</p>
                  <p className="text-[11px] text-white/35 font-medium">{selectedUnit.route}</p>
                </div>
              </div>
            )}

            {drivers.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-6 py-8 text-center">
                <p className="text-sm font-semibold text-white/70">No drivers available</p>
                <p className="text-xs text-white/35 mt-2">
                  Driver assignments will appear here once the backend connection is active.
                </p>
              </div>
            ) : (
              <DriverList drivers={drivers} onSelect={handleSelectDriver} />
            )}
          </div>
        )}
      </div>

      {submitError && (
        <div className="px-4 pb-4 max-w-md mx-auto w-full">
          <p className="text-center text-xs text-red-300">{submitError}</p>
        </div>
      )}

      <StartShiftModal
        show={showConfirmModal}
        unit={selectedUnit}
        driver={selectedDriver}
        conductorName={profile?.name ?? "Conductor"}
        isProcessing={isProcessing}
        onConfirm={handleConfirmShift}
        onCancel={() => setShowConfirmModal(false)}
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
