"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck, X } from "lucide-react";
import { StepContentWrapper } from "@/components/Stepper";
import {
  cancelEmailChange, confirmEmailChange, EmailChangeError, getEmailChangeState,
  sendEmailChangeCode, startEmailChange, verifyEmailChangeIdentity,
  type EmailChangeState,
} from "@/lib/commuter/services/email-change.service";

type Action = "load" | "start" | "send-old" | "send-new" | "identity" | "confirm" | "cancel";

function maskEmail(email: string) {
  const separator = email.lastIndexOf("@");
  if (separator < 1) return email;
  const name = email.slice(0, separator);
  return `${name[0]}******${name.length > 1 ? name.slice(-1) : ""}${email.slice(separator)}`;
}

export default function ChangeEmailDialog({ currentEmail, onClose, onChanged }: {
  currentEmail: string;
  onClose: () => void;
  onChanged: (email: string) => void;
}) {
  const [state, setState] = useState<EmailChangeState | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<Action | null>("load");
  const [error, setError] = useState<EmailChangeError | null>(null);
  const [method, setMethod] = useState<"email" | "password">("email");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [updatedEmail, setUpdatedEmail] = useState<string | null>(null);
  const [throttleUntil, setThrottleUntil] = useState(0);
  const busyRef = useRef(true);
  const mountedRef = useRef(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const inputBaseId = useId();
  const errorId = useId();
  const helpBaseId = useId();
  const reduceMotion = useReducedMotion();
  const flow = state?.flow;
  const step = updatedEmail ? "success" : editingAddress && flow?.step === "verify" ? "email" : flow?.step ?? "identity";
  const progress = step === "identity" ? 0 : step === "email" ? 1 : step === "verify" ? 2 : 3;
  const inputId = `${inputBaseId}-${step}`;
  const helpId = `${helpBaseId}-${step}`;
  const focusStepRef = useRef(step);
  const [previousProgress, setPreviousProgress] = useState(progress);
  const [stepDirection, setStepDirection] = useState(0);
  if (progress !== previousProgress) {
    setPreviousProgress(progress);
    setStepDirection(progress > previousProgress ? 1 : -1);
  }
  const elapsed = Math.max(0, Math.floor((now - receivedAt) / 1000));
  const serverNow = state ? Date.parse(state.server_now) + elapsed * 1000 : now;
  const remaining = (seconds = 0) => Math.max(0, seconds - elapsed);
  const oldWait = remaining(state?.old_resend_in_seconds);
  const newWait = remaining(state?.new_resend_in_seconds);
  const passwordWait = remaining(state?.password_retry_after);
  const flowExpired = !!flow && Date.parse(flow.expires_at) <= serverNow;
  const dailyBlocked = !flow && !!state?.blocked_until && Date.parse(state.blocked_until) > serverNow;
  const throttled = throttleUntil > now;
  const identityLocked = method === "email" ? flow?.old_attempts_left === 0 : passwordWait > 0;
  const newLocked = flow?.new_attempts_left === 0;
  const codeExpiresAt = step === "identity" ? flow?.old_code_expires_at : flow?.new_code_expires_at;
  const codeExpired = !!codeExpiresAt && Date.parse(codeExpiresAt) <= serverNow;
  const disabled = !!busy || throttled || !state || dailyBlocked || flowExpired;
  const cannotSubmit = disabled || (step === "identity"
    ? identityLocked || (method === "password" ? !password : flow?.old_code_sent ? code.length !== 6 || codeExpired : oldWait > 0)
    : step === "email" ? !email.trim() || newWait > 0 || newLocked : code.length !== 6 || codeExpired || newLocked);
  const inputClass = `w-full rounded-xl border bg-[#050F1A] px-4 py-3 text-base text-white placeholder:text-white/30 light:bg-white light:text-gray-900 light:placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:opacity-50 ${error?.field ? "border-red-500/50 focus:border-red-400 focus:ring-red-500/20" : "border-white/10 focus:border-[#62A0EA] focus:ring-[#62A0EA]/20 light:border-gray-200 light:focus:border-[#1A5FB4]"}`;
  const primaryClass = "inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#1A5FB4] px-4 py-3 text-sm font-semibold text-white hover:bg-[#164A8F] disabled:cursor-not-allowed disabled:opacity-50";
  const secondaryClass = "min-h-11 flex-1 whitespace-nowrap rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70 hover:bg-white/5 light:border-gray-200 light:text-gray-700 light:hover:bg-gray-100 disabled:opacity-50";

  function accept(next: EmailChangeState) {
    setState(next);
    setReceivedAt(Date.now());
    setNow(Date.now());
  }

  useEffect(() => {
    let active = true;
    getEmailChangeState().then(next => {
      if (!active) return;
      setState(next);
      setReceivedAt(Date.now());
      setEmail(next.flow?.new_email ?? "");
    }).catch(caught => {
      if (active) setError(caught as EmailChangeError);
    }).finally(() => {
      if (active) { setBusy(null); busyRef.current = false; }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    titleRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyRef.current) onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]') ?? []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !controls.includes(active as HTMLElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (active === last || !controls.includes(active as HTMLElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      mountedRef.current = false;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (busy) return;
    const changingStep = focusStepRef.current !== step;
    focusStepRef.current = step;
    const timer = window.setTimeout(() => {
      if (step === "success") titleRef.current?.focus({ preventScroll: true });
      else panelRef.current?.querySelector<HTMLInputElement>(`input[id="${inputId}"]`)?.focus({ preventScroll: true });
    }, changingStep && !reduceMotion ? 420 : 0);
    return () => window.clearTimeout(timer);
  }, [step, method, flow?.old_code_sent, busy, inputId, reduceMotion]);

  async function run(action: Action, operation: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(action);
    setError(null);
    try {
      await operation();
    } catch (caught) {
      if (!mountedRef.current) return;
      const failure = caught instanceof EmailChangeError ? caught : new EmailChangeError(0, "Something went wrong. Please try again.");
      setError(failure);
      setPassword("");
      if (failure.reason === "duplicate_email" || failure.reason === "same_email") setEditingAddress(true);
      if (failure.status === 429 && failure.reason === "error") setThrottleUntil(Date.now() + failure.retryAfter * 1000);
      // Keep the exact request for safe confirmation retries after an uncertain
      // network response. The backend makes confirmation idempotent.
      if (action !== "load" && failure.status !== 401 && (action !== "confirm" || (failure.status >= 400 && failure.status < 500))) {
        try { accept(await getEmailChangeState()); } catch { /* Keep the actionable original error. */ }
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(null);
    }
  }

  async function ensureFlow() {
    if (flow) return flow.id;
    const next = await startEmailChange();
    accept(next);
    return next.flow!.id;
  }

  function sendOld() {
    void run("send-old", async () => {
      const id = await ensureFlow();
      accept(await sendEmailChangeCode(id, "old"));
      setCode("");
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cannotSubmit) return;
    if (step === "identity") {
      if (method === "email" && !flow?.old_code_sent) { sendOld(); return; }
      void run("identity", async () => {
        const id = await ensureFlow();
        accept(await verifyEmailChangeIdentity(id, method, method === "password" ? password : code));
        setPassword(""); setCode("");
      });
    } else if (step === "email" && flow) {
      void run("send-new", async () => {
        const next = await sendEmailChangeCode(flow.id, "new", email.trim());
        accept(next); setEmail(next.flow?.new_email ?? ""); setEditingAddress(false); setCode("");
      });
    } else if (step === "verify" && flow) {
      void run("confirm", async () => {
        const result = await confirmEmailChange(flow.id, code);
        setUpdatedEmail(result.email);
        setCode("");
        onChanged(result.email);
      });
    }
  }

  function cancel() {
    if (!flow) { onClose(); return; }
    void run("cancel", async () => { await cancelEmailChange(flow.id); onClose(); });
  }

  const close = () => { if (!busyRef.current) onClose(); };
  const spinner = busy && <Loader2 size={16} aria-hidden="true" className="shrink-0 animate-spin" />;
  const title = step === "success" ? "Email updated" : step === "identity" ? "Change email" : step === "email" ? "Enter your new email" : "Verify your new email";

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
      <div ref={panelRef} data-profile-subdialog="email" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={!!busy} className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#071A2E] shadow-2xl light:border-gray-200 light:bg-white sm:max-w-lg sm:rounded-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 p-5 light:border-gray-200 sm:p-6">
          <div className="min-w-0">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#99C1F1] light:border-[#1A5FB4]/20 light:bg-[#1A5FB4]/10 light:text-[#1A5FB4]">{step === "success" ? <CheckCircle2 size={22} aria-hidden="true" /> : <Mail size={22} aria-hidden="true" />}</div>
            <h2 ref={titleRef} tabIndex={-1} id={titleId} className="text-xl font-bold text-white light:text-gray-900 outline-none">{title}</h2>
            <p className="mt-1 text-sm text-white/50 light:text-gray-500">{step === "success" ? "Your new address is verified and saved." : "Keep your account secure at every step."}</p>
          </div>
          <button type="button" onClick={close} disabled={!!busy} aria-label="Close change email" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/50 hover:bg-white/5 hover:text-white light:text-gray-400 light:hover:bg-gray-100 light:hover:text-gray-900 disabled:opacity-50"><X size={20} aria-hidden="true" /></button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
          <ol aria-label="Email change progress" className="mb-5 grid grid-cols-3 gap-2">
            {["Your identity", "New address", "Verify email"].map((label, index) => (
              <li key={label} aria-current={progress === index ? "step" : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1.5 text-center text-[10px] transition-colors duration-300 motion-reduce:transition-none sm:text-xs ${progress >= index ? "text-[#99C1F1] light:text-[#1A5FB4]" : "text-white/35 light:text-gray-400"}`}>
                <span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 motion-reduce:transition-none ${progress === index ? "border-[#62A0EA] bg-[#1A5FB4] text-white" : progress > index ? "border-[#62A0EA]/30 bg-[#62A0EA]/10" : "border-white/10 light:border-gray-300"}`}>
                  {progress === index && (
                    <motion.span
                      aria-hidden="true"
                      layoutId={`${titleId}-active-step`}
                      initial={false}
                      transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="pointer-events-none absolute -inset-1 rounded-full border border-[#62A0EA]/60"
                    />
                  )}
                  <AnimatePresence initial={false}>
                    {progress > index ? (
                      <motion.span key="complete" className="absolute inset-0 flex items-center justify-center" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
                        <motion.svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <motion.path d="m20 6-11 11-5-5" initial={reduceMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduceMotion ? 0 : 0.3, ease: "easeOut" }} />
                        </motion.svg>
                      </motion.span>
                    ) : (
                      <motion.span key="number" className="absolute inset-0 flex items-center justify-center" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.15 }}>{index + 1}</motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ol>

          {error && <p id={errorId} role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm leading-relaxed text-red-300 light:border-red-200 light:bg-red-50 light:text-red-700">{error.message}</p>}
          {throttled && <p role="status" className="mb-4 text-xs text-amber-300 light:text-amber-700">You can continue in {Math.ceil((throttleUntil - now) / 1000)}s.</p>}
          {flowExpired && step !== "success" && <p role="status" className="mb-4 text-sm text-amber-300 light:text-amber-700">Your verification session has expired. Start again to continue.</p>}
          {dailyBlocked && <p role="status" className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200 light:text-amber-800">You&apos;ve reached the daily limit. Try again after {new Date(state!.blocked_until!).toLocaleString()}.</p>}

          <StepContentWrapper currentStep={progress + 1} direction={stepDirection} className="-mx-0.5">
          <div className="p-0.5">
          {step === "success" ? <>
            <p className="text-sm text-white/60 light:text-gray-600">Your registered email is now</p>
            <p className="mt-2 break-all rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-base font-semibold text-emerald-200 light:text-emerald-800">{updatedEmail}</p>
            <p className="mt-4 text-sm leading-relaxed text-white/50 light:text-gray-500">Use this address for sign-in and account messages. A security notification has been requested for your previous address.</p>
            <button type="button" onClick={close} className={`${primaryClass} mt-6 w-full`}>Done</button>
          </> : busy === "load" ? <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-white/60 light:text-gray-600"><Loader2 size={18} className="animate-spin" />Loading email settings...</div> : !state ? <button type="button" disabled={!!busy} onClick={() => void run("load", async () => accept(await getEmailChangeState()))} className={`${primaryClass} w-full`}>{spinner}Try again</button> : flowExpired ? <button type="button" disabled={!!busy} onClick={() => void run("start", async () => { accept(await startEmailChange()); setCode(""); setPassword(""); setEditingAddress(false); })} className={`${primaryClass} w-full`}>{spinner}Start again</button> : <form onSubmit={submit} noValidate>
            {step === "identity" ? <>
              <p className="text-xs text-white/50 light:text-gray-500">Currently registered email</p>
              <p className="mt-1 break-all text-sm text-white/90 light:text-gray-900">{maskEmail(flow?.current_email ?? currentEmail)}</p>
              <p className="mt-4 text-sm leading-relaxed text-white/60 light:text-gray-600">Confirm it&apos;s you using a code sent to your current email or your current password.</p>
              <div className="my-4 grid grid-cols-2 gap-2" role="group" aria-label="Verify your identity using">
                {(["email", "password"] as const).map(option => <button key={option} type="button" aria-pressed={method === option} disabled={!!busy} onClick={() => { setMethod(option); setPassword(""); setShowPassword(false); setCode(""); setError(null); }} className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-3 text-sm font-medium ${method === option ? "border-[#62A0EA]/40 bg-[#62A0EA]/10 text-[#99C1F1] light:text-[#1A5FB4]" : "border-white/10 text-white/50 hover:bg-white/5 light:border-gray-200 light:text-gray-500 light:hover:bg-gray-100"}`}>{option === "email" ? <Mail size={16} aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}{option === "email" ? "Email code" : "Password"}</button>)}
              </div>
              {method === "password" ? <>
                <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-white/80 light:text-gray-700">Current password</label>
                <div className="relative">
                  <input id={inputId} type={showPassword ? "text" : "password"} autoComplete="current-password" maxLength={1024} value={password} onChange={event => { setPassword(event.target.value); setError(null); }} disabled={disabled || passwordWait > 0} aria-invalid={error?.field === "current_password"} aria-describedby={error?.field === "current_password" ? errorId : undefined} className={`${inputClass} pr-14`} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(visible => !visible)}
                    disabled={disabled || passwordWait > 0}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    aria-controls={inputId}
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-white/50 transition-colors hover:text-white light:text-gray-400 light:hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                  </button>
                </div>
                {passwordWait > 0 && <p role="status" className="mt-2 text-xs text-amber-300 light:text-amber-700">Password verification is temporarily locked. Try again in {Math.ceil(passwordWait / 60)} minutes or use an email code.</p>}
              </> : flow?.old_code_sent ? <>
                <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-white/80 light:text-gray-700">Verification code</label>
                <input id={inputId} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} placeholder="000000" disabled={disabled || identityLocked} aria-invalid={error?.field === "code"} aria-describedby={error?.field === "code" ? `${helpId} ${errorId}` : helpId} className={`${inputClass} text-center tracking-[0.35em]`} />
                <p id={helpId} className="mt-2 text-xs text-white/50 light:text-gray-500">{codeExpired ? "This code expired. Request a new one." : "Enter the six-digit code sent to your current email."}</p>
                <button type="button" onClick={sendOld} disabled={disabled || oldWait > 0 || identityLocked} className="mt-3 min-h-11 text-sm font-medium text-[#99C1F1] disabled:text-white/30 light:text-[#1A5FB4] light:disabled:text-gray-300">{busy === "send-old" ? "Sending..." : oldWait > 0 ? `Resend in ${oldWait}s` : "Resend code"}</button>
              </> : <p className="rounded-xl border border-white/10 bg-[#050F1A] p-4 light:border-gray-200 light:bg-gray-50 text-sm leading-relaxed text-white/60 light:text-gray-600">We&apos;ll send a six-digit code to your currently registered email. It expires in 15 minutes.</p>}
              {identityLocked && method === "email" && <p role="status" className="mt-3 text-xs text-amber-300 light:text-amber-700">This code has reached its attempt limit. Use your current password or cancel and start again.</p>}
            </> : step === "email" ? <>
              <div className="mb-4 flex items-center gap-2 text-xs text-emerald-300 light:text-emerald-700"><ShieldCheck size={16} aria-hidden="true" />Account ownership verified</div>
              <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-white/80 light:text-gray-700">New email address</label>
              <input id={inputId} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={255} value={email} onChange={event => { setEmail(event.target.value); setError(null); }} placeholder="yourname@gmail.com" disabled={disabled || newLocked} aria-invalid={error?.field === "email"} aria-describedby={error?.field === "email" ? `${helpId} ${errorId}` : helpId} className={inputClass} />
              <p id={helpId} className="mt-3 text-xs leading-relaxed text-white/50 light:text-gray-500">We&apos;ll send a verification code to this address. Your registered email stays the same until you confirm the code.</p>
              {newWait > 0 && <p role="status" className="mt-3 text-xs text-white/50 light:text-gray-500">You can request another code in {newWait}s.</p>}
            </> : <>
              <p className="text-sm text-white/60 light:text-gray-600">Enter the six-digit code sent to</p>
              <p className="mt-1 break-all text-sm font-semibold text-white light:text-gray-900">{flow?.new_email}</p>
              <button type="button" disabled={!!busy || newLocked} onClick={() => { setEditingAddress(true); setEmail(flow?.new_email ?? ""); setCode(""); setError(null); }} className="mb-4 mt-2 min-h-11 text-xs font-medium text-[#99C1F1] disabled:opacity-50 light:text-[#1A5FB4]">Change address</button>
              <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-white/80 light:text-gray-700">Verification code</label>
              <input id={inputId} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} placeholder="000000" disabled={disabled || newLocked} aria-invalid={error?.field === "code"} aria-describedby={error?.field === "code" ? `${helpId} ${errorId}` : helpId} className={`${inputClass} text-center tracking-[0.35em]`} />
              <p id={helpId} className="mt-2 text-xs text-white/50 light:text-gray-500">{codeExpired ? "This code expired. Request a new one." : "Only the most recently sent code can be used."}</p>
              <button type="button" disabled={disabled || newWait > 0 || newLocked} onClick={() => void run("send-new", async () => { accept(await sendEmailChangeCode(flow!.id, "new", flow!.new_email!)); setCode(""); })} className="mt-3 min-h-11 text-sm font-medium text-[#99C1F1] disabled:text-white/30 light:text-[#1A5FB4] light:disabled:text-gray-300">{busy === "send-new" ? "Sending..." : newWait > 0 ? `Resend in ${newWait}s` : "Resend code"}</button>
              {newLocked && <p role="status" className="mt-2 text-xs text-amber-300 light:text-amber-700">Too many incorrect codes. Cancel this request and start again.</p>}
            </>}
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={cancel} disabled={!!busy} className={secondaryClass}>Cancel</button>
              <button type="submit" disabled={cannotSubmit} className={primaryClass}>{spinner}{busy === "confirm" ? "Updating..." : busy === "send-old" || busy === "send-new" ? "Sending..." : busy === "identity" ? "Verifying..." : step === "identity" ? method === "email" && !flow?.old_code_sent ? oldWait > 0 ? `Wait ${oldWait}s` : "Send code" : "Continue" : step === "email" ? "Send code" : "Confirm"}</button>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-white/35 light:text-gray-400">Up to 3 email change requests in 24 hours. Canceled requests count toward this limit. Closing this window keeps your current request available.</p>
          </form>}
          </div>
          </StepContentWrapper>
        </div>
      </div>
    </div>,
    document.body
  );
}
