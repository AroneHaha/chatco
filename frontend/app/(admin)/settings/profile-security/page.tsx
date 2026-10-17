// app/(admin)/settings/profile-security/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getInitials } from '@/components/admin/layout/admin-identity';
import CodeInput from '@/components/auth/code-input';
import { PASSWORD_RULES } from '@/lib/utils/password-policy';
import {
  PasswordChangeError,
  confirmPasswordChange,
  requestPasswordChangeCode,
} from '@/lib/admin/services/account.service';

/**
 * Settings > Profile & Security — the signed-in admin's own account.
 *
 * Profile is read-only (name, sign-in email, role from the auth context).
 * Password change is the same two-step flow as the commuter profile: the
 * passwords are checked first and a 6-digit code goes to the admin's email;
 * only the code step actually changes the password, and it signs the admin
 * out of every other session.
 *
 * Light-ready: rendered inside the settings panel, which follows the admin
 * theme (see settings-drawer).
 */

type Field = 'currentPassword' | 'newPassword' | 'confirmNewPassword' | 'code';
type Step = 'passwords' | 'code';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmNewPassword: '' };

const inputClasses = 'block h-11 w-full rounded-md border bg-[#0E1628] admin-light:bg-white px-3 pr-11 text-sm text-white admin-light:text-slate-900 outline-none transition-colors placeholder:text-slate-600 admin-light:placeholder:text-slate-400 focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60';
const inputTone = (hasError: boolean) => hasError
  ? 'border-red-500/50 admin-light:border-red-300 focus:border-red-400/60 focus:ring-red-400/30'
  : 'border-[#1E2D45] admin-light:border-[#CBD5E1] focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4] focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-400 admin-light:text-red-600">{message}</p>;
}

function PasswordField({
  id, label, value, onChange, error, disabled, autoComplete, describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoComplete: string;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-300 admin-light:text-slate-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={[error ? errorId : null, describedBy].filter(Boolean).join(' ') || undefined}
          className={`${inputClasses} ${inputTone(Boolean(error))}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate-500 transition-colors hover:text-slate-300 admin-light:hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:opacity-50"
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

/** One label column, one content column; stacked below lg. */
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 py-8 first:pt-0 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
      <header>
        <h3 className="text-sm font-semibold text-white admin-light:text-slate-900">{title}</h3>
        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{description}</p>
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function ProfileSecurityPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('passwords');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const inFlight = useRef(false);

  // Resend countdown, one tick per second while it's running.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const name = user?.name?.trim() || user?.email || '';
  const unmetRules = PASSWORD_RULES.filter((rule) => !rule.test(form.newPassword));

  const updateField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError(null);
    setNotice(null);
  };

  const applyError = (err: unknown) => {
    if (err instanceof PasswordChangeError && err.field) {
      setFieldErrors({ [err.field]: err.message });
      // A password problem found at the code step belongs to the first step.
      if (err.field !== 'code') setStep('passwords');
      return;
    }
    setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
  };

  /** Phase 1, also used by "Resend code". */
  const sendCode = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const sent = await requestPasswordChangeCode(form);
      setExpiresInMinutes(sent.expiresInMinutes);
      setResendIn(sent.resendInSeconds);
      setCode('');
      setFieldErrors({});
      setStep('code');
    } catch (err) {
      applyError(err);
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handlePasswordsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Partial<Record<Field, string>> = {};
    if (!form.currentPassword) errors.currentPassword = 'Enter your current password.';
    if (unmetRules.length > 0) errors.newPassword = 'Your new password doesn’t meet every requirement below.';
    else if (form.newPassword === form.currentPassword) errors.newPassword = 'Use a password different from your current one.';
    if (form.confirmNewPassword !== form.newPassword) errors.confirmNewPassword = 'The passwords don’t match.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    void sendCode();
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    if (code.length !== 6) {
      setFieldErrors({ code: 'Enter the 6-digit code from the email.' });
      return;
    }
    inFlight.current = true;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await confirmPasswordChange({ ...form, code });
      setForm(EMPTY_FORM);
      setCode('');
      setFieldErrors({});
      setStep('passwords');
      setNotice('Password updated. You’ve been signed out on your other devices; this session stays signed in.');
    } catch (err) {
      applyError(err);
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const backToPasswords = () => {
    setStep('passwords');
    setCode('');
    setFieldErrors({});
    setFormError(null);
  };

  return (
    <div className="px-5 pb-12 sm:px-8">
      <div className="mx-auto w-full max-w-3xl divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
        <Section title="Profile" description="The administrator account you’re signed in with.">
          {user ? (
            <>
              <div className="flex min-w-0 items-center gap-4">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#1A2540] admin-light:bg-[#EEF2F7] text-sm font-semibold text-[#62A0EA] admin-light:text-[#1A5FB4]">
                  {getInitials(name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white admin-light:text-slate-900" title={name}>{name}</p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
              </div>
              <dl className="mt-5 border-t border-[#1E2D45] admin-light:border-[#E2E8F0]">
                <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                  <dt className="text-xs text-slate-500">Sign-in email</dt>
                  <dd className="min-w-0">
                    <p className="break-all text-sm text-slate-200 admin-light:text-slate-800">{user.email}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Password-change codes are sent here.</p>
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="flex items-center gap-4" aria-busy="true" aria-label="Loading profile">
              <div className="h-12 w-12 rounded-md bg-[#1A2540] admin-light:bg-[#EEF2F7] animate-pulse motion-reduce:animate-none" />
              <div className="space-y-2">
                <div className="h-3.5 w-40 rounded bg-[#1A2540] admin-light:bg-[#EEF2F7] animate-pulse motion-reduce:animate-none" />
                <div className="h-3 w-24 rounded bg-[#1A2540] admin-light:bg-[#EEF2F7] animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
          )}
        </Section>

        <Section title="Password" description="Changing it signs you out everywhere else. A code sent to your email confirms it’s you.">
          {notice && (
            <div role="status" className="mb-5 flex items-start gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400 admin-light:text-emerald-700" aria-hidden="true" />
              <p className="text-sm text-emerald-300 admin-light:text-emerald-800">{notice}</p>
            </div>
          )}
          {formError && (
            <div role="alert" className="mb-5 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400 admin-light:text-red-600" aria-hidden="true" />
              <p className="text-sm text-red-300 admin-light:text-red-700">{formError}</p>
            </div>
          )}

          {/* Where the admin is in the two steps, as plain text. */}
          <ol className="mb-5 flex items-center gap-2 text-xs" aria-label="Password change steps">
            <li className={step === 'passwords' ? 'font-semibold text-white admin-light:text-slate-900' : 'text-slate-500'} aria-current={step === 'passwords' ? 'step' : undefined}>1. New password</li>
            <li aria-hidden="true" className="text-slate-600 admin-light:text-slate-300">/</li>
            <li className={step === 'code' ? 'font-semibold text-white admin-light:text-slate-900' : 'text-slate-500'} aria-current={step === 'code' ? 'step' : undefined}>2. Email code</li>
          </ol>

          {step === 'passwords' ? (
            <form onSubmit={handlePasswordsSubmit} noValidate className="max-w-md space-y-4">
              <PasswordField
                id="current-password"
                label="Current password"
                value={form.currentPassword}
                onChange={(v) => updateField('currentPassword', v)}
                error={fieldErrors.currentPassword}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              <div>
                <PasswordField
                  id="new-password"
                  label="New password"
                  value={form.newPassword}
                  onChange={(v) => updateField('newPassword', v)}
                  error={fieldErrors.newPassword}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  describedBy="new-password-rules"
                />
                <ul id="new-password-rules" className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2" aria-label="Password requirements">
                  {PASSWORD_RULES.map((rule) => {
                    const met = rule.test(form.newPassword);
                    return (
                      <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${met ? 'text-emerald-400 admin-light:text-emerald-700' : 'text-slate-500'}`}>
                        {met
                          ? <Check size={13} strokeWidth={3} aria-hidden="true" />
                          : <span aria-hidden="true" className="mx-[4.5px] h-1 w-1 rounded-full bg-current" />}
                        {rule.label}
                        <span className="sr-only">{met ? '(met)' : '(not met)'}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <PasswordField
                id="confirm-new-password"
                label="Confirm new password"
                value={form.confirmNewPassword}
                onChange={(v) => updateField('confirmNewPassword', v)}
                error={fieldErrors.confirmNewPassword}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] admin-light:focus-visible:ring-offset-[#F1F5F9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                    : <Mail size={16} aria-hidden="true" />}
                  {isSubmitting ? 'Sending code...' : 'Email me a code'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} noValidate className="max-w-md">
              <p className="text-sm leading-6 text-slate-300 admin-light:text-slate-700">
                Enter the 6-digit code we sent to <span className="font-semibold text-white admin-light:text-slate-900">{user?.email}</span>
                {expiresInMinutes ? `. It expires in ${expiresInMinutes} minutes.` : '.'}
              </p>
              <div className="mt-4">
                <CodeInput
                  variant="admin"
                  value={code}
                  onChange={(next) => { setCode(next); setFieldErrors({}); setFormError(null); }}
                  disabled={isSubmitting}
                  hasError={Boolean(fieldErrors.code)}
                />
                <FieldError id="code-error" message={fieldErrors.code} />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] admin-light:focus-visible:ring-offset-[#F1F5F9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                    : <KeyRound size={16} aria-hidden="true" />}
                  {isSubmitting ? 'Updating...' : 'Update password'}
                </button>
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={isSubmitting || resendIn > 0}
                  className="text-sm font-medium text-[#8CB9F0] admin-light:text-[#1A5FB4] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-500 disabled:no-underline"
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={backToPasswords}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 admin-light:text-slate-500 hover:text-white admin-light:hover:text-slate-900 disabled:opacity-50 sm:ml-auto"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  Change passwords
                </button>
              </div>
            </form>
          )}
        </Section>
      </div>
    </div>
  );
}
