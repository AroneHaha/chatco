"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startShift, getActiveShift } from "@/lib/conductor-shift";

/* ═════════════ Types ═════════════ */

interface UnitAccount {
  unitId: string;
  unitNumber: string;
  plateNumber: string;
  route: string;
  driverName: string;
  status: "active" | "inactive" | "maintenance";
}

type Step = "select-unit" | "verify-admin" | "credentials";

/* ═════════════ Mock Data ═════════════ */

const UNIT_ACCOUNTS: UnitAccount[] = [
  {
    unitId: "UNIT-001",
    unitNumber: "RIZ 2024",
    plateNumber: "NBY-4521",
    route: "Meycauayan – Calumpit",
    driverName: "Ramon Dela Cruz",
    status: "active",
  },
  {
    unitId: "UNIT-002",
    unitNumber: "RIZ 2025",
    plateNumber: "MBK-7832",
    route: "Meycauayan – Malolos",
    driverName: "Pedro Santos",
    status: "active",
  },
  {
    unitId: "UNIT-003",
    unitNumber: "RIZ 2026",
    plateNumber: "BLT-1094",
    route: "Meycauayan – Bocaue",
    driverName: "Jose Garcia",
    status: "maintenance",
  },
  {
    unitId: "UNIT-004",
    unitNumber: "RIZ 2027",
    plateNumber: "SVR-3367",
    route: "Marilao – Calumpit",
    driverName: "Antonio Reyes",
    status: "inactive",
  },
];

const DEV_CODE = "000000";
const DEV_ID = "mark";
const DEV_PIN = "1234";

/* ═════════════ Status Helpers ═════════════ */

const statusConfig: Record<UnitAccount["status"], { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25" },
  inactive: { label: "Inactive", color: "text-white/30", bg: "bg-white/5 border-white/10" },
  maintenance: { label: "Maintenance", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/25" },
};

/* ═════════════ Component ═════════════ */

export default function ConductorLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("select-unit");
  const [selectedUnit, setSelectedUnit] = useState<UnitAccount | null>(null);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [conductorId, setConductorId] = useState("");
  const [conductorPin, setConductorPin] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("left");
  const [animKey, setAnimKey] = useState(0);

  // Dev mode state
  const [devVisible, setDevVisible] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<NodeJS.Timeout | null>(null);

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if shift already active
  useEffect(() => {
    if (getActiveShift()) {
      router.replace("/conductor-dashboard");
    }
  }, [router]);

  /* ── Dev mode trigger: tap version text 5 times quickly ── */
  const handleDevTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);

    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setDevVisible(true);
      return;
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 2000);
  };

  /* ── Navigation with animation ── */
  const navigateTo = (target: Step, direction: "left" | "right") => {
    setSlideDirection(direction);
    setAnimKey((k) => k + 1);
    setError("");
    setStep(target);
  };

  const goBack = () => {
    if (step === "credentials") {
      setConductorId("");
      setConductorPin("");
      navigateTo("verify-admin", "right");
    } else if (step === "verify-admin") {
      setSelectedUnit(null);
      setCode(["", "", "", "", "", ""]);
      navigateTo("select-unit", "right");
    }
  };

  /* ── Step 1: Select Unit ── */
  const handleSelectUnit = (unit: UnitAccount) => {
    if (unit.status !== "active") return;
    setSelectedUnit(unit);
    navigateTo("verify-admin", "left");
  };

  /* ── Step 2: Verification Code ── */
  const handleCodeInput = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(0, 1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setError("");

    if (digit && idx < 5) {
      codeRefs.current[idx + 1]?.focus();
    }
  };

  const handleCodeKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length === 6) {
      setCode(digits.split(""));
      codeRefs.current[5]?.focus();
      setError("");
    }
  };

  const handleVerify = async () => {
    const full = code.join("");
    if (full.length < 6) {
      setError("Enter the complete 6-digit code");
      return;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1400));
    setProcessing(false);

    if (full === DEV_CODE) {
      navigateTo("credentials", "left");
    } else {
      setError("Invalid code. Contact your admin.");
    }
  };

  /* ── Step 3: Credentials ── */
  const handleLogin = async () => {
    if (!conductorId.trim() || !conductorPin.trim()) {
      setError("Enter both Conductor ID and PIN");
      return;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setProcessing(false);

    if (conductorId.toLowerCase() === DEV_ID && conductorPin === DEV_PIN) {
      if (selectedUnit) {
        startShift({
          conductorName: "Mark",
          unitNumber: selectedUnit.unitNumber,
          route: selectedUnit.route,
          driverName: selectedUnit.driverName,
        });
      }
      router.push("/conductor-dashboard");
    } else {
      setError("Invalid Conductor ID or PIN");
    }
  };

  /* ── Dev Actions ── */
  const devSkipVerify = () => {
    setDevVisible(false);
    navigateTo("credentials", "left");
  };
  const devFillCreds = () => {
    setConductorId(DEV_ID);
    setConductorPin(DEV_PIN);
    setDevVisible(false);
  };
  const devAutoLogin = () => {
    setDevVisible(false);
    if (selectedUnit) {
      startShift({
        conductorName: "Mark",
        unitNumber: selectedUnit.unitNumber,
        route: selectedUnit.route,
        driverName: selectedUnit.driverName,
      });
    }
    router.push("/conductor-dashboard");
  };

  /* ═════════════ Render Helpers ═════════════ */

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="text-center space-y-2 mb-6">
      <h1 className="text-white font-bold text-xl">{title}</h1>
      {subtitle && <p className="text-white/40 text-xs leading-relaxed max-w-xs mx-auto">{subtitle}</p>}
    </div>
  );

  const renderBack = () => (
    <button
      onClick={goBack}
      className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95 mb-4"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
    </button>
  );

  const renderError = () =>
    error && (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-4">
        <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <p className="text-xs text-red-400 font-medium">{error}</p>
      </div>
    );

  /* ═════════════ Step: Select Unit ═════════════ */

  const renderSelectUnit = () => (
    <div className="space-y-4">
      {renderHeader("Select Unit Account", "Choose the vehicle unit assigned to you for this shift.")}

      <div className="space-y-2.5">
        {UNIT_ACCOUNTS.map((unit) => {
          const cfg = statusConfig[unit.status];
          const isAvailable = unit.status === "active";

          return (
            <button
              key={unit.unitId}
              onClick={() => handleSelectUnit(unit)}
              disabled={!isAvailable}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                isAvailable
                  ? "bg-[#071A2E] border-white/[0.06] hover:border-[#1A5FB4]/40 hover:bg-[#071A2E]/80 active:scale-[0.98]"
                  : "bg-[#071A2E]/40 border-white/[0.03] opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className={`w-10 h-10 rounded-xl ${isAvailable ? "bg-[#1A5FB4]/15" : "bg-white/5"} flex items-center justify-center flex-shrink-0`}>
                      <svg className={`w-5 h-5 ${isAvailable ? "text-[#62A0EA]" : "text-white/20"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H6.375c-.621 0-1.125-.504-1.125-1.125V14.25m17.25 4.5V14.25A2.25 2.25 0 0 0 20.25 12H3.75A2.25 2.25 0 0 0 1.5 14.25v4.5" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm ${isAvailable ? "text-white" : "text-white/40"}`}>{unit.unitNumber}</p>
                      <p className="text-[11px] text-white/35 font-medium mt-0.5 truncate">{unit.route}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-[50px]">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                      </svg>
                      <span className="text-[11px] text-white/35 font-medium">{unit.driverName}</span>
                    </div>
                    <span className="text-[10px] text-white/15 font-mono">{unit.plateNumber}</span>
                  </div>
                </div>
                <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ═════════════ Step: Admin Verification ═════════════ */

  const renderVerifyAdmin = () => (
    <div className="space-y-5">
      {renderBack()}
      {renderHeader("Admin Verification", "Enter the 6-digit code provided by your admin to authorize this unit.")}

      {/* Selected Unit Summary */}
      {selectedUnit && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1A5FB4]/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-[#62A0EA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0H6.375c-.621 0-1.125-.504-1.125-1.125V14.25m17.25 4.5V14.25A2.25 2.25 0 0 0 20.25 12H3.75A2.25 2.25 0 0 0 1.5 14.25v4.5" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{selectedUnit.unitNumber}</p>
            <p className="text-[11px] text-white/35 font-medium">{selectedUnit.route} · {selectedUnit.driverName}</p>
          </div>
        </div>
      )}

      {renderError()}

      {/* Code Input */}
      <div className="flex justify-center gap-3" onPaste={handleCodePaste}>
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { codeRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeInput(i, e.target.value)}
            onKeyDown={(e) => handleCodeKey(i, e)}
            className={`w-12 h-14 rounded-xl text-center text-xl font-bold outline-none transition-all duration-200 ${
              digit
                ? "bg-[#1A5FB4]/20 border-2 border-[#1A5FB4]/60 text-white"
                : "bg-white/5 border-2 border-white/10 text-white placeholder:text-white/15 focus:border-[#1A5FB4]/40"
            }`}
            autoFocus={i === 0}
          />
        ))}
      </div>

      <button
        onClick={handleVerify}
        disabled={processing || code.join("").length < 6}
        className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
          processing || code.join("").length < 6
            ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
            : "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/25 hover:bg-[#165a9f] active:scale-[0.98]"
        }`}
      >
        {processing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Verifying…
          </>
        ) : (
          "Verify Code"
        )}
      </button>

      <p className="text-center text-[10px] text-white/20 leading-relaxed">
        Ask your admin for the verification code assigned to this unit.
      </p>
    </div>
  );

  /* ═════════════ Step: Credentials ═════════════ */

  const renderCredentials = () => (
    <div className="space-y-5">
      {renderBack()}
      {renderHeader("Conductor Login", "Enter your conductor credentials to start the shift.")}

      {renderError()}

      {/* Conductor ID */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Conductor ID</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
            </svg>
          </div>
          <input
            type="text"
            value={conductorId}
            onChange={(e) => { setConductorId(e.target.value); setError(""); }}
            placeholder="e.g. mark"
            autoComplete="off"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/15 outline-none focus:border-[#1A5FB4]/50 focus:ring-2 focus:ring-[#1A5FB4]/20 transition-all"
          />
        </div>
      </div>

      {/* PIN */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">PIN</label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <input
            type="password"
            value={conductorPin}
            onChange={(e) => { setConductorPin(e.target.value); setError(""); }}
            placeholder="••••"
            maxLength={6}
            inputMode="numeric"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/15 outline-none focus:border-[#1A5FB4]/50 focus:ring-2 focus:ring-[#1A5FB4]/20 transition-all tracking-[0.3em]"
          />
        </div>
      </div>

      {/* Login Button */}
      <button
        onClick={handleLogin}
        disabled={processing || !conductorId.trim() || !conductorPin.trim()}
        className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 mt-2 ${
          processing || !conductorId.trim() || !conductorPin.trim()
            ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
            : "bg-[#1A5FB4] text-white shadow-lg shadow-[#1A5FB4]/25 hover:bg-[#165a9f] active:scale-[0.98]"
        }`}
      >
        {processing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Logging in…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Start Shift
          </>
        )}
      </button>
    </div>
  );

  /* ═════════════ Dev Mode Panel ═════════════ */

  const renderDevPanel = () =>
    devVisible && (
      <div className="fixed inset-0 z-[200] flex items-end justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDevVisible(false)} />
        <div className="relative w-full max-w-sm bg-[#0B1E33] border border-amber-500/20 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
          <div className="px-4 py-3 border-b border-amber-500/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.193-.14 1.743" />
                </svg>
              </div>
              <p className="text-xs font-bold text-amber-400">Dev Mode</p>
            </div>
            <button onClick={() => setDevVisible(false)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:bg-white/10 hover:text-white transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-2">
            {step === "verify-admin" && (
              <button onClick={devSkipVerify} className="w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors">
                Skip Verification
              </button>
            )}
            {step === "credentials" && (
              <>
                <button onClick={devFillCreds} className="w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors">
                  Auto-fill Credentials
                </button>
                <button onClick={devAutoLogin} className="w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors">
                  Skip All → Dashboard
                </button>
              </>
            )}

            <div className="pt-2 border-t border-white/[0.06] space-y-1">
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-wider">Credentials</p>
              <p className="text-[11px] text-white/30 font-mono">ID: <span className="text-white/50">{DEV_ID}</span> · PIN: <span className="text-white/50">{DEV_PIN}</span></p>
              <p className="text-[11px] text-white/30 font-mono">Code: <span className="text-white/50">{DEV_CODE}</span></p>
            </div>
          </div>
        </div>
      </div>
    );

  /* ═════════════ Main Render ═════════════ */

  return (
    <div className="min-h-screen bg-[#050F1A] flex flex-col">
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-[#1A5FB4]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative flex-1 flex flex-col justify-center px-4 py-10 max-w-md mx-auto w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            CHATCO<span className="text-[#62A0EA]">.</span>
          </h1>
          <p className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-semibold mt-1">Conductor Portal</p>
        </div>

        {/* Step Content with slide animation */}
        <div
          key={animKey}
          className={`animate-${slideDirection === "left" ? "slide-in-right" : "slide-in-left"}`}
        >
          {step === "select-unit" && renderSelectUnit()}
          {step === "verify-admin" && renderVerifyAdmin()}
          {step === "credentials" && renderCredentials()}
        </div>
      </div>

      {/* Dev trigger — tiny version text */}
      <button
        onClick={handleDevTap}
        className="absolute bottom-3 right-4 text-[9px] text-white/[0.08] font-mono select-none z-10"
      >
        v1.0.0
      </button>

      {/* Dev panel */}
      {renderDevPanel()}

      {/* Animations */}
      <style jsx global>{`
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
        .animate-slide-in-left { animation: slide-in-left 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}