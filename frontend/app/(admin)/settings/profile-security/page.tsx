// app/(admin)/settings/profile-security/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Camera, Check, CheckCircle2, Eye, EyeOff, ImagePlus, KeyRound, Mail, Trash2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { getInitials } from '@/components/admin/layout/admin-identity';
import CodeInput from '@/components/auth/code-input';
import { PASSWORD_RULES } from '@/lib/utils/password-policy';
import {
  PasswordChangeError,
  confirmPasswordChange,
  requestPasswordChangeCode,
  uploadProfilePhoto,
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
  const { user, logout, updateProfilePicture } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('passwords');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const photoFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [otpOpen, setOtpOpen] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

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
      setOtpOpen(true);
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
      setOtpOpen(false);
      setPasswordChanged(true);
      window.setTimeout(() => void logout('/'), 1800);
    } catch (err) {
      applyError(err);
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const backToPasswords = () => {
    setStep('passwords');
    setOtpOpen(false);
    setCode('');
    setFieldErrors({});
    setFormError(null);
  };

  const handlePhotoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (photoFlight.current) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setPhotoError('Choose an image of 3 MB or smaller.');
      return;
    }
    setPhotoError(null);
    setPhotoNotice(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoOpen(true);
  };

  const closePhotoPreview = () => {
    if (photoFlight.current) return;
    setPhotoOpen(false);
    setPhotoPreview(null);
    setPhotoError(null);
    setPhotoFile(null);
  };

  const savePhoto = async () => {
    if (!photoFile || photoFlight.current) return;
    photoFlight.current = true;
    setPhotoSaving(true); setPhotoError(null);
    try {
      const url = await uploadProfilePhoto(photoFile);
      if (!mounted.current) return;
      updateProfilePicture(url);
      setPhotoNotice('Profile picture updated.');
      setPhotoOpen(false); setPhotoFile(null); setPhotoPreview(null);
    } catch (error) {
      if (mounted.current) setPhotoError(error instanceof Error ? error.message : 'Unable to save the picture. Please retry.');
    } finally {
      photoFlight.current = false;
      if (mounted.current) setPhotoSaving(false);
    }
  };

  return (
    <div className="px-5 pb-12 sm:px-8">
      <div className="mx-auto w-full max-w-3xl divide-y divide-[#1E2D45] admin-light:divide-[#E2E8F0]">
        <Section title="Profile" description="The administrator account you’re signed in with.">
          {user ? (
            <>
              <div className="flex min-w-0 flex-wrap items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#1A2540] admin-light:bg-[#EEF2F7] text-base font-semibold text-[#62A0EA] admin-light:text-[#1A5FB4]" aria-label="Current profile picture">
                  {user.profilePictureUrl && failedPhotoUrl !== user.profilePictureUrl
                    ? <Image src={user.profilePictureUrl} alt="Your profile picture" width={56} height={56} unoptimized className="h-full w-full rounded-md object-cover" onError={() => setFailedPhotoUrl(user.profilePictureUrl ?? null)} />
                    : getInitials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-white admin-light:text-slate-900" title={name}>{name}</p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
                <button type="button" onClick={() => { setPhotoError(null); setPhotoOpen(true); }} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#1E2D45] admin-light:border-[#CBD5E1] px-3 text-xs font-semibold text-slate-200 admin-light:text-slate-700 transition-colors hover:bg-white/5 admin-light:hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]">
                  <Camera size={15} aria-hidden="true" /> Change picture
                </button>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelection} disabled={photoSaving} className="sr-only" aria-label="Choose a profile picture" />
              </div>
              {photoNotice && <p role="status" className="mt-3 text-xs text-slate-500">{photoNotice}</p>}
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

        <Section title="Password" description="Changing it signs you out of all admin sessions. A code sent to your email confirms it’s you, and you’ll sign in again with the new password.">
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
            <div className="max-w-md rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] px-4 py-3">
              <p className="text-sm text-slate-300 admin-light:text-slate-700">A verification code was sent to <span className="font-semibold text-white admin-light:text-slate-900">{user?.email}</span>.</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => setOtpOpen(true)} className="text-sm font-semibold text-[#8CB9F0] admin-light:text-[#1A5FB4] hover:underline">Enter verification code</button>
                <button type="button" onClick={() => void sendCode()} disabled={isSubmitting || resendIn > 0} className="text-sm text-slate-400 admin-light:text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50">
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
                <button type="button" onClick={backToPasswords} disabled={isSubmitting} className="ml-auto inline-flex items-center gap-1 text-sm text-slate-400 admin-light:text-slate-600 hover:text-white admin-light:hover:text-slate-900 disabled:opacity-50">
                  <ArrowLeft size={14} aria-hidden="true" /> Change passwords
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>

      {photoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="profile-photo-title" className="my-auto w-full max-w-lg rounded-lg border border-[#1E2D45] admin-light:border-[#CBD5E1] bg-[#131C2E] admin-light:bg-white p-5 shadow-2xl sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 id="profile-photo-title" className="text-base font-semibold text-white admin-light:text-slate-900">Change profile picture</h2>
                <p className="mt-1 text-sm leading-5 text-slate-400 admin-light:text-slate-600">Choose an image to preview how it will look on your account.</p>
              </div>
              <button type="button" onClick={closePhotoPreview} aria-label="Close profile picture preview" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white admin-light:hover:bg-slate-100 admin-light:hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]"><X size={18} aria-hidden="true" /></button>
            </header>
            <div className="mt-5 flex min-h-52 items-center justify-center overflow-hidden rounded-md border border-dashed border-[#33445F] admin-light:border-slate-300 bg-[#0E1628] admin-light:bg-slate-50 p-4">
              {photoPreview
                ? <Image src={photoPreview} alt="Selected profile picture preview" width={176} height={176} unoptimized className="h-44 w-44 rounded-md object-cover" />
                : <div className="flex flex-col items-center gap-2 text-center text-slate-500 admin-light:text-slate-500"><ImagePlus size={32} aria-hidden="true" /><p className="text-sm">Select a JPG, PNG, or WebP image (up to 3 MB).</p></div>}
            </div>
            {photoError && <p role="alert" className="mt-3 text-sm text-red-400 admin-light:text-red-600">{photoError}</p>}
            <p className="mt-3 text-xs leading-5 text-slate-500">Save to update your picture across the Admin interface. Your current picture stays unchanged if the upload fails.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => photoInputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#1E2D45] admin-light:border-[#CBD5E1] px-3 text-sm font-medium text-slate-200 admin-light:text-slate-700 hover:bg-white/5 admin-light:hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4]"><Upload size={15} aria-hidden="true" />{photoPreview ? 'Replace image' : 'Choose image'}</button>
              {photoPreview && <button type="button" disabled={photoSaving} onClick={() => { setPhotoPreview(null); setPhotoFile(null); setPhotoError(null); }} className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-red-300 admin-light:text-red-600 hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"><Trash2 size={15} aria-hidden="true" />Remove preview</button>}
              <span className="flex-1" />
              <button type="button" onClick={closePhotoPreview} className="h-10 rounded-md px-4 text-sm font-medium text-slate-300 admin-light:text-slate-700 hover:bg-white/5 admin-light:hover:bg-slate-100">Cancel</button>
              <button type="button" disabled={!photoFile || photoSaving} onClick={() => void savePhoto()} className="h-10 rounded-md bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-4 text-sm font-semibold text-white hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] disabled:cursor-not-allowed disabled:opacity-50">{photoSaving ? 'Saving picture…' : 'Save picture'}</button>
            </div>
          </section>
        </div>
      )}

      {otpOpen && step === 'code' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="password-code-title" className="my-auto w-full max-w-md rounded-lg border border-[#1E2D45] admin-light:border-[#CBD5E1] bg-[#131C2E] admin-light:bg-white p-5 shadow-2xl sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 id="password-code-title" className="text-base font-semibold text-white admin-light:text-slate-900">Verify your email</h2>
                <p className="mt-1 text-sm leading-5 text-slate-400 admin-light:text-slate-600">Enter the 6-digit code sent to <span className="font-semibold text-slate-200 admin-light:text-slate-800">{user?.email}</span>{expiresInMinutes ? `. It expires in ${expiresInMinutes} minutes.` : '.'}</p>
              </div>
              <button type="button" onClick={backToPasswords} disabled={isSubmitting} aria-label="Cancel password change" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white admin-light:hover:bg-slate-100 admin-light:hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:opacity-50"><X size={18} aria-hidden="true" /></button>
            </header>
            {formError && <div role="alert" className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 admin-light:text-red-700">{formError}</div>}
            <form onSubmit={handleCodeSubmit} noValidate className="mt-5">
              <CodeInput variant="admin" value={code} onChange={(next) => { setCode(next); setFieldErrors({}); setFormError(null); }} disabled={isSubmitting} hasError={Boolean(fieldErrors.code)} />
              <FieldError id="code-error" message={fieldErrors.code} />
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                <button type="submit" disabled={isSubmitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] disabled:cursor-not-allowed disabled:opacity-50">
                  {isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : <KeyRound size={16} aria-hidden="true" />}
                  {isSubmitting ? 'Updating...' : 'Verify and change password'}
                </button>
                <button type="button" onClick={() => void sendCode()} disabled={isSubmitting || resendIn > 0} className="text-sm font-medium text-[#8CB9F0] admin-light:text-[#1A5FB4] hover:underline disabled:cursor-not-allowed disabled:text-slate-500 disabled:no-underline">{resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {passwordChanged && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="presentation">
          <section role="alertdialog" aria-modal="true" aria-labelledby="password-success-title" aria-describedby="password-success-description" className="w-full max-w-sm rounded-lg border border-emerald-500/25 bg-[#131C2E] admin-light:bg-white p-6 text-center shadow-2xl">
            <CheckCircle2 size={38} className="mx-auto text-emerald-400 admin-light:text-emerald-600" aria-hidden="true" />
            <h2 id="password-success-title" className="mt-4 text-lg font-semibold text-white admin-light:text-slate-900">Password changed</h2>
            <p id="password-success-description" className="mt-2 text-sm leading-5 text-slate-400 admin-light:text-slate-600">Your password was updated. You’re being signed out now. Log in again with your new password.</p>
            <p role="status" className="mt-4 text-xs font-medium text-slate-500">Redirecting to the landing page…</p>
          </section>
        </div>
      )}
    </div>
  );
}
