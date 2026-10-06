// app/components/auth/login-form.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import styles from "./login.module.css";

export default function LoginForm({ onBusyChange }: { onBusyChange?: (busy: boolean) => void }) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isSuspendedError = error.toLowerCase().includes("account is suspended");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    onBusyChange?.(true);
    setError("");

    try {
      // Use auth context login — this calls /api/auth/login, sets httpOnly cookie,
      // and updates the global auth state. Role-based redirect is handled here.
      const redirectPath = await login(email, password);
      router.push(redirectPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div>
      <h2 id="sign-in-heading" className={styles.formHeading}>
        Welcome back
      </h2>
      <p id="login-description" className={styles.formIntro}>
        Sign in with your email or username.
      </p>

      {/* Error Message Display */}
      {error && (
        <div id="login-error" role="alert" className={`${styles.error} ${isSuspendedError ? styles.suspended : ""}`}>
          {isSuspendedError && <p className={styles.errorTitle}>Account suspended</p>}
          <p>{error}</p>
          {isSuspendedError && (
            <Link href="/" className={styles.errorRecovery}>
              Back to home page
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} aria-busy={isLoading}>
        {/* Email/Username Input */}
        <div>
          <label htmlFor="email" className={styles.fieldLabel}>
            Email or Username
          </label>
          <input
            id="email"
            type="text"
            required
            autoComplete="username"
            autoFocus
            autoCapitalize="none"
            spellCheck={false}
            disabled={isLoading}
            aria-invalid={!!error && !isSuspendedError}
            aria-describedby={error ? "login-error" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="Email or username"
          />
        </div>

        {/* Password Input */}
        <div>
          <div className={styles.labelRow}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <Link href="/forgot-password" className={styles.recovery}>
              Forgot password?
            </Link>
          </div>
          <div className={styles.passwordWrap}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              disabled={isLoading}
              aria-invalid={!!error && !isSuspendedError}
              aria-describedby={error ? "login-error" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.passwordInput}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className={styles.passwordToggle}
            >
              {showPassword ? <EyeOff size={19} strokeWidth={1.7} aria-hidden="true" /> : <Eye size={19} strokeWidth={1.7} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={styles.submit}
        >
          {isLoading ? (
            <>
              <span>Signing in</span>
              <LoaderCircle className={styles.spinner} size={19} aria-hidden="true" />
            </>
          ) : (
            <><span>Sign In</span><ArrowRight size={19} aria-hidden="true" /></>
          )}
        </button>
      </form>

      {/* Footer Link */}
      <p className={styles.registration}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" className={styles.textLink}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
