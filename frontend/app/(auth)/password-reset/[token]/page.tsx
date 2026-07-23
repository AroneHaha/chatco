"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../../assets/logo-transparent.png";
import Footer from "@/components/landing/Footer";

/**
 * /password-reset/[token]?email=...
 *
 * Landing page for password reset links. The token comes from the URL path
 * (dynamic segment), the email comes from the query string. The user enters
 * a new password + confirmation, then we POST to /api/auth/reset-password.
 *
 * Wrapped in <Suspense> because useSearchParams() opts the route into
 * client-side rendering — Next.js 16 requires Suspense around it for
 * static page generation to succeed.
 */
export default function PasswordResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-[#1A5FB4] animate-spin" />
        </div>
      }
    >
      <PasswordResetContent />
    </Suspense>
  );
}

function PasswordResetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = decodeURIComponent(params?.token || "");
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    if (password !== passwordConfirmation) {
      setErrorMsg("Passwords do not match.");
      setStatus("error");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("success");
        // Redirect to login after 3 seconds.
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setErrorMsg(data?.message ?? "Unable to reset password. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Unable to reach the server. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex">
        {/* Left Side (Same Branding) */}
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
              Set a new
              <br />
              <span className="text-[#62A0EA]">password</span>
            </h1>
            <p className="mt-6 text-white/50 max-w-md">
              Choose a strong password you haven&apos;t used before. Your security is our priority.
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

            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reset your password</h2>
              <p className="mt-2 text-sm text-gray-500">
                {email ? (
                  <>For <span className="font-medium text-gray-700">{email}</span></>
                ) : (
                  "Enter your new password below."
                )}
              </p>

              {status === "success" ? (
                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm text-green-800 font-medium">Password reset! ✅</p>
                  <p className="mt-1 text-sm text-green-700">
                    Redirecting you to login… (or{" "}
                    <Link href="/login" className="font-semibold underline">click here</Link>)
                  </p>
                </div>
              ) : (
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A5FB4] outline-none"
                      disabled={status === "submitting"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A5FB4] outline-none"
                      disabled={status === "submitting"}
                    />
                  </div>

                  {status === "error" && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-700">{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting" || !password || !passwordConfirmation}
                    className="w-full bg-[#1A5FB4] text-white py-3 rounded-xl font-semibold hover:bg-[#174a8c] transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {status === "submitting" ? "Resetting…" : "Reset Password"}
                  </button>
                </form>
              )}

              <p className="mt-6 text-sm text-gray-500 text-center">
                <Link href="/login" className="text-[#1A5FB4] font-medium hover:underline">
                  Back to login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
