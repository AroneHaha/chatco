"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, CircleCheck, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/utils/password-policy";
import styles from "./login.module.css";

/** How long the success message stays up before signing out and going home. */
const SIGN_OUT_DELAY_MS = 2500;

/**
 * Mandatory first-time password change, styled with the sign-in modal's classes
 * so the two read as one flow. The backend (EnsurePasswordChanged) blocks
 * everything else until this succeeds; this form only collects the new
 * password. Nothing is kept in browser storage, and the password fields are
 * cleared once the change is accepted.
 */
export default function SetNewPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activated, setActivated] = useState(false);

  // Success: end the session, then leave for the landing page. The backend has
  // already revoked the session, so the logout call only clears the cookie.
  useEffect(() => {
    if (!activated) return;
    const timer = window.setTimeout(async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
      } catch {
        // Redirect regardless: the server has already revoked the session.
      }
      window.location.replace("/");
    }, SIGN_OUT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [activated]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setError("");

    if (PASSWORD_RULES.some((rule) => !rule.test(password))) {
      setError("Your new password does not meet every requirement below.");
      return;
    }
    if (password !== confirm) {
      setError("The new passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/auth/set-new-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ password, password_confirmation: confirm }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        setPassword("");
        setConfirm("");
        setActivated(true);
        return;
      }

      if (response.status === 401) {
        window.location.replace("/login?reason=session_ended");
        return;
      }

      setError(
        data?.errors?.password?.[0] ??
          data?.message ??
          "We could not update your password. Please try again."
      );
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (activated) {
    return (
      <div role="status" className="text-center">
        <CircleCheck className={styles.recoverySuccess} size={40} strokeWidth={1.5} aria-hidden="true" />
        <h1 id="set-password-heading" className={styles.formHeading}>
          Your account is active
        </h1>
        <p id="set-password-description" className={styles.formIntro}>
          Your password has been updated and your account has been activated. For your security,
          you have been signed out. Sign in with your new password to continue.
        </p>
        <p className={styles.recoveryHelp}>Taking you to the CHATCO home page...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 id="set-password-heading" className={styles.formHeading}>
        Set your password
      </h1>
      <p id="set-password-description" className={styles.formIntro}>
        Your account was created with a default password. Choose your own password to finish
        setting up your account.
      </p>

      {error && (
        <div id="set-password-error" role="alert" className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} aria-busy={isSaving}>
        <PasswordField
          id="new-password"
          label="New Password"
          value={password}
          onChange={setPassword}
          disabled={isSaving}
          autoFocus
          describedBy={error ? "set-password-error password-rules" : "password-rules"}
        />

        <PasswordField
          id="confirm-new-password"
          label="Confirm New Password"
          value={confirm}
          onChange={setConfirm}
          disabled={isSaving}
          describedBy={error ? "set-password-error" : undefined}
        />

        <ul id="password-rules" className="grid gap-1.5 text-xs" aria-label="Password requirements">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li key={rule.id} className={`flex items-center gap-2 ${met ? "text-[#62A0EA]" : "text-white/60"}`}>
                {/* Fixed-width slot (dot until met, then a check) so labels don't shift. */}
                <span className="inline-flex w-[14px] justify-center" aria-hidden="true">
                  {met ? <Check size={14} strokeWidth={2.2} /> : <span className="h-1 w-1 rounded-full bg-white/40" />}
                </span>
                <span>
                  {rule.label}
                  <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
                </span>
              </li>
            );
          })}
        </ul>

        <button type="submit" disabled={isSaving} className={styles.submit}>
          {isSaving ? (
            <>
              <span>Saving</span>
              <LoaderCircle className={styles.spinner} size={19} aria-hidden="true" />
            </>
          ) : (
            <>
              <span>Set password</span>
              <ArrowRight size={19} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  autoFocus = false,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  autoFocus?: boolean;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          autoComplete="new-password"
          autoFocus={autoFocus}
          disabled={disabled}
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.passwordInput}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className={styles.passwordToggle}
        >
          {visible ? <EyeOff size={19} strokeWidth={1.7} aria-hidden="true" /> : <Eye size={19} strokeWidth={1.7} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
