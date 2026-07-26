"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import logo from "../../../assets/logo-transparent.png";
import Footer from "@/components/landing/Footer";

/**
 * Forgot-password flow — 6-digit code, three steps on a single page:
 *
 *   1. "email"    — enter the account email; backend emails a 6-digit code.
 *   2. "code"     — enter the code; backend verifies it (wrong/expired = error).
 *   3. "password" — set + confirm the new password; backend re-verifies the
 *                   code and saves the password, then we bounce to /login.
 *
 * The email step reports an unregistered address explicitly (backend returns
 * 404) rather than advancing to the code screen — otherwise users sat waiting
 * for a code that was never sent. Rejected registrations count as
 * unregistered: rejection rewrites the account's email to a placeholder.
 */

type Step = "email" | "code" | "password" | "done";
type Status = "idle" | "loading";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [resendNote, setResendNote] = useState("");

  // Step 1 — request a code.
  async function handleRequestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    setResendNote("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setCode("");
        setStep("code");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setErrorMsg("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setStatus("idle");
    }
  }

  // Resend the code (re-runs step 1 without leaving the code screen).
  async function handleResend() {
    setStatus("loading");
    setErrorMsg("");
    setResendNote("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setResendNote("A new code is on its way. Check your inbox.");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.message ?? "Couldn't resend the code. Please try again.");
      }
    } catch {
      setErrorMsg("Unable to reach the server. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  // Step 2 — verify the code.
  async function handleVerifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    if (code.length !== 6) {
      setErrorMsg("Enter the 6-digit code from your email.");
      setStatus("idle");
      return;
    }

    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (res.ok) {
        setPassword("");
        setPasswordConfirmation("");
        setStep("password");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.message ?? "That code is incorrect or has expired.");
      }
    } catch {
      setErrorMsg("Unable to reach the server. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  // Step 3 — set the new password.
  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStep("done");
        setTimeout(() => router.push("/login"), 3000);
      } else {
        // If the code went stale between steps, send the user back to re-enter it.
        setErrorMsg(data?.message ?? "Unable to reset password. Please try again.");
        if (res.status === 400 && /code/i.test(data?.message ?? "")) {
          setStep("code");
          setCode("");
        }
      }
    } catch {
      setErrorMsg("Unable to reach the server. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  const loading = status === "loading";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex">
        {/* Left Side (Branding) */}
        <div className="hidden lg:flex lg:w-1/2 relative hero-bg overflow-hidden flex-col">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-[#1A5FB4]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#3584E4]/15 rounded-full blur-[100px]" />
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-[#62A0EA]/10 rounded-full blur-[80px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative z-10 pt-12 px-16">
            <Link href="/" className="inline-flex items-center gap-5 hover:opacity-80">
              <Image src={logo} alt="CHATCO" width={95} height={95} />
              <span className="text-4xl font-extrabold text-white">CHATCO</span>
            </Link>
          </div>
          <div className="relative z-10 flex-1 flex flex-col justify-center px-16">
            <h1 className="text-5xl font-extrabold text-white leading-tight">
              Forgot your
              <br />
              <span className="text-[#62A0EA]">password?</span>
            </h1>
            <p className="mt-6 text-white/50 max-w-md">
              No worries. Enter your email and we&apos;ll send you a 6-digit code to reset it.
            </p>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 pt-16 lg:pt-12">
          <div className="w-full max-w-md">
            <Link
              href="/login"
              className="lg:hidden inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1A5FB4] mb-10"
            >
              ← Back to login
            </Link>

            {/* Step indicator */}
            {step !== "done" && (
              <div className="flex items-center gap-2 mb-6">
                {(["email", "code", "password"] as const).map((s, i) => {
                  const order = { email: 0, code: 1, password: 2 } as const;
                  const active = order[step as "email" | "code" | "password"] >= i;
                  return (
                    <div
                      key={s}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        active ? "bg-[#1A5FB4]" : "bg-gray-200"
                      }`}
                    />
                  );
                })}
              </div>
            )}

            {/* STEP 1 — EMAIL */}
            {step === "email" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Reset your password</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Enter your email address and we&apos;ll send you a 6-digit code.
                </p>

                <form className="mt-8 space-y-6" onSubmit={handleRequestCode}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#1A5FB4] outline-none"
                      disabled={loading}
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-700">{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full bg-[#1A5FB4] text-white py-3 rounded-xl font-semibold hover:bg-[#174a8c] transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending…" : "Send Code"}
                  </button>
                </form>
              </div>
            )}

            {/* STEP 2 — CODE */}
            {step === "code" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Enter the code</h2>
                <p className="mt-2 text-sm text-gray-500">
                  We&apos;ve sent a 6-digit code to{" "}
                  <span className="font-semibold text-gray-700">{email}</span>. It expires in 15
                  minutes.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  No email after a few minutes? Check your spam folder, then resend.
                </p>

                <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">6-digit code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-center text-2xl font-semibold tracking-[0.5em] text-gray-900 placeholder-gray-300 focus:ring-2 focus:ring-[#1A5FB4] outline-none"
                      disabled={loading}
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-700">{errorMsg}</p>
                    </div>
                  )}
                  {resendNote && !errorMsg && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-sm text-green-700">{resendNote}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full bg-[#1A5FB4] text-white py-3 rounded-xl font-semibold hover:bg-[#174a8c] transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Verifying…" : "Verify Code"}
                  </button>
                </form>

                <div className="mt-6 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setErrorMsg("");
                      setResendNote("");
                    }}
                    className="text-gray-500 hover:text-[#1A5FB4]"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-[#1A5FB4] font-medium hover:underline disabled:opacity-60"
                  >
                    Resend code
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — NEW PASSWORD */}
            {step === "password" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Set a new password</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Choose a strong password you haven&apos;t used before.
                </p>

                <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#1A5FB4] outline-none"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#1A5FB4] outline-none"
                      disabled={loading}
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-700">{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !password || !passwordConfirmation}
                    className="w-full bg-[#1A5FB4] text-white py-3 rounded-xl font-semibold hover:bg-[#174a8c] transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Resetting…" : "Reset Password"}
                  </button>
                </form>
              </div>
            )}

            {/* DONE */}
            {step === "done" && (
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 border border-green-200">
                  <svg
                    className="h-10 w-10 text-green-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>

                <h2 className="mt-8 text-3xl font-bold text-gray-900">Password reset</h2>
                <p className="mt-3 text-base text-gray-500 leading-relaxed">
                  Your password has been changed. You can now sign in with your new password.
                </p>

                <Link
                  href="/login"
                  className="mt-8 block w-full bg-[#1A5FB4] text-white py-3 rounded-xl font-semibold hover:bg-[#174a8c] transition"
                >
                  Go to login
                </Link>

                <p className="mt-4 text-sm text-gray-400">Redirecting you automatically…</p>
              </div>
            )}

            {/* Back to login */}
            {step !== "done" && (
              <p className="mt-6 text-sm text-gray-500 text-center">
                Remember your password?{" "}
                <Link href="/login" className="text-[#1A5FB4] font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
