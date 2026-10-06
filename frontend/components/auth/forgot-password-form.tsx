"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleCheck, LoaderCircle } from "lucide-react";
import styles from "./login.module.css";

type Step = "email" | "code" | "password" | "done";

const STEPS = ["email", "code", "password"] as const;
const COPY = {
  email: { title: "Reset your password", description: "Enter your email address and we'll send you a 6-digit code." },
  code: { title: "Enter the code", description: "Enter the 6-digit code from your email to continue." },
  password: { title: "Set a new password", description: "Choose a strong password you haven't used before." },
  done: { title: "Password reset", description: "Your password has been changed. You can now sign in with your new password." },
};

async function request(path: string, body: Record<string, string>, fallback: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, message: typeof data.message === "string" ? data.message : fallback };
}

export default function ForgotPasswordForm({ onBusyChange, onReturnToLogin }: { onBusyChange: (busy: boolean) => void; onReturnToLogin: () => void }) {
  const content = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [resendNote, setResendNote] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      content.current?.closest("dialog")?.scrollTo({ top: 0, behavior: "instant" });
      content.current?.querySelector<HTMLElement>(step === "done" ? 'a[href="/login"]' : "input")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    if (step !== "done") return;
    const timer = setTimeout(onReturnToLogin, 3000);
    return () => clearTimeout(timer);
  }, [step, onReturnToLogin]);

  function setBusy(busy: boolean) {
    setLoading(busy);
    onBusyChange(busy);
  }

  async function sendCode(resend = false) {
    if (loading) return;
    setBusy(true);
    setError("");
    setResendNote("");
    try {
      const result = await request("/api/auth/forgot-password", { email }, resend ? "Couldn't resend the code. Please try again." : "Something went wrong. Please try again.");
      if (result.ok) {
        setCode("");
        if (resend) setResendNote("A new code is on its way. Check your inbox.");
        else setStep("code");
      } else setError(result.message);
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (loading) return;
    setError("");
    setResendNote("");
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      const result = await request("/api/auth/verify-reset-code", { email, code }, "That code is incorrect or has expired.");
      if (result.ok) {
        setPassword("");
        setConfirmation("");
        setStep("password");
      } else setError(result.message);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (loading) return;
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await request("/api/auth/reset-password", {
        email, code, password, password_confirmation: confirmation,
      }, "Unable to reset password. Please try again.");
      if (result.ok) {
        setPassword("");
        setConfirmation("");
        setStep("done");
      } else {
        setError(result.message);
        if (result.status === 400 && /code/i.test(result.message)) {
          setCode("");
          setStep("code");
        }
      }
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "email") void sendCode();
    else if (step === "code") void verifyCode();
    else if (step === "password") void resetPassword();
  }

  const activeIndex = STEPS.indexOf(step as typeof STEPS[number]);
  const buttonText = step === "email" ? (loading ? "Sending" : "Send Code") : step === "code" ? (loading ? "Verifying" : "Verify Code") : (loading ? "Resetting" : "Reset Password");
  const disabled = loading || (step === "email" ? !email : step === "code" ? code.length !== 6 : !password || !confirmation);

  return (
    <div ref={content}>
      {step === "done" && <CircleCheck className={styles.recoverySuccess} size={40} strokeWidth={1.5} aria-hidden="true" />}
      <h2 id="reset-heading" className={styles.formHeading}>{COPY[step].title}</h2>
      <p id="reset-description" className={styles.formIntro}>{COPY[step].description}</p>

      {step !== "done" && (
        <ol className={styles.recoverySteps} aria-label="Password recovery steps">
          {STEPS.map((item, index) => (
            <li key={item} aria-current={step === item ? "step" : undefined} data-complete={activeIndex > index}>
              {item === "email" ? "Email" : item === "code" ? "Verify code" : "New password"}
            </li>
          ))}
        </ol>
      )}

      {step === "code" && (
        <div className={styles.recoveryHelp}>
          <p>Sent to <strong>{email}</strong>. It expires in 15 minutes.</p>
          <p>Check your spam folder if it hasn&apos;t arrived.</p>
        </div>
      )}

      {error && <div id="reset-error" role="alert" className={styles.error}>{error}</div>}
      {resendNote && !error && <p className={styles.recoveryNote} role="status">{resendNote}</p>}

      {step !== "done" ? (
        <>
          <form className={styles.form} onSubmit={submit} aria-busy={loading}>
            {step === "email" && (
              <div>
                <label htmlFor="reset-email" className={styles.fieldLabel}>Email address</label>
                <input id="reset-email" type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className={styles.input} disabled={loading} aria-invalid={!!error} aria-describedby={error ? "reset-error" : undefined} />
              </div>
            )}
            {step === "code" && (
              <div>
                <label htmlFor="reset-code" className={styles.fieldLabel}>6-digit code</label>
                <input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" className={`${styles.input} ${styles.recoveryCode}`} disabled={loading} aria-invalid={!!error} aria-describedby={error ? "reset-error" : undefined} />
              </div>
            )}
            {step === "password" && (
              <>
                <div>
                  <label htmlFor="new-password" className={styles.fieldLabel}>New password</label>
                  <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" className={styles.input} disabled={loading} aria-invalid={!!error} aria-describedby={error ? "reset-error" : undefined} />
                </div>
                <div>
                  <label htmlFor="confirm-new-password" className={styles.fieldLabel}>Confirm new password</label>
                  <input id="confirm-new-password" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Repeat your password" className={styles.input} disabled={loading} aria-invalid={!!error} aria-describedby={error ? "reset-error" : undefined} />
                </div>
              </>
            )}
            <button type="submit" disabled={disabled} className={styles.submit}>
              <span>{buttonText}</span>
              {loading ? <LoaderCircle className={styles.spinner} size={19} aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}
            </button>
          </form>
          {step === "code" && (
            <div className={styles.recoveryActions}>
              <button type="button" className={styles.textLink} disabled={loading} onClick={() => { setStep("email"); setError(""); setResendNote(""); setCode(""); }}><ArrowLeft size={14} aria-hidden="true" />Change email</button>
              <button type="button" className={styles.textLink} disabled={loading} onClick={() => void sendCode(true)}>Resend code</button>
            </div>
          )}
          <p className={styles.registration}>
            Remember your password?{" "}<Link href="/login" replace className={styles.textLink} aria-disabled={loading} onClick={event => { event.preventDefault(); if (!loading) onReturnToLogin(); }}>Sign in</Link>
          </p>
        </>
      ) : (
        <>
          <Link href="/login" replace className={`${styles.submit} ${styles.recoveryLogin}`} onClick={event => { event.preventDefault(); onReturnToLogin(); }}><span>Go to login</span><ArrowRight size={19} aria-hidden="true" /></Link>
          <p className={styles.recoveryHelp} role="status">Redirecting you automatically…</p>
        </>
      )}
    </div>
  );
}
