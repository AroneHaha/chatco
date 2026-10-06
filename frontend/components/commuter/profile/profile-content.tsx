"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, KeyRound, Loader2, LogOut, Pencil, Save, X } from "lucide-react";
import { useProfile } from "@/app/(commuter)/profile/use-profile";
import { AccountStatus } from "@/app/(commuter)/profile/types";
import { getCommuterTypeLabel } from "@/types";

/**
 * The commuter Profile body, shared by both shells — same split as the
 * conductor's SettingsContent:
 *   - the full page (app/(commuter)/profile/page.tsx), used below xl:, by the
 *     lg: sidebar, and for direct links/refreshes;
 *   - the xl:+ popover (CommuterProfileModal), opened from CommuterDock so
 *     the commuter doesn't leave whatever tab they were on.
 * useProfile() owns all the data/business logic, so there is exactly one
 * implementation of it.
 *
 * `variant="page"` keeps the page's original full-height scroll wrapper and
 * full-height loading/error states; `variant="modal"` drops them because the
 * popover panel is the scroll container.
 *
 * The logout confirmation and Change Password dialogs are portaled to
 * <body>: inside the popover, the panel's transform-based entrance animation
 * would otherwise make their `fixed inset-0` overlays position relative to
 * the panel instead of the viewport.
 */
export default function ProfileContent({ variant = "page" }: { variant?: "page" | "modal" }) {
  const isPage = variant === "page";
  // Logging out is one tap from a scrollable page and is not undoable without
  // re-entering credentials, so it goes through a confirmation first — same
  // treatment the admin side already gives it (components/admin/ui/sign-out-modal).
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const subdialogRef = useRef<HTMLDivElement>(null);
  const {
    profile,
    loadState,
    loadError,
    retryLoad,
    isEditing,
    editData,
    startEditing,
    cancelEditing,
    saveProfile,
    isSaving,
    saveError,
    handleEditChange,
    showPasswordModal,
    setShowPasswordModal,
    passwordStep,
    passwordData,
    setPasswordData,
    verificationCode,
    setVerificationCode,
    resendSecondsLeft,
    isChangingPassword,
    handleRequestPasswordChangeCode,
    handleConfirmPasswordChange,
    handleResendCode,
    handleBackToPasswordForm,
    passwordError,
    passwordErrorField,
    closePasswordModal,
    successMessage,
    handleReuploadId,
    handleLogout,
  } = useProfile();

  useEffect(() => {
    if (isPage || (!showLogoutConfirm && !showPasswordModal)) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const controls = () => Array.from(subdialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]') ?? []);
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isChangingPassword) {
        setShowLogoutConfirm(false);
        closePasswordModal();
      }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  // The hook's close handler changes identity on render; keep focus stable
  // while typing rather than re-focusing the first field on every keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPage, showLogoutConfirm, showPasswordModal, isChangingPassword]);

  // ─── Load error ───────────────────────────────────────────────────
  if (loadState === "error") {
    return (
      <div className={isPage ? "h-full w-full flex flex-col items-center justify-center bg-[#050F1A] p-6" : "flex flex-col items-center justify-center px-6 py-20"}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-white font-semibold text-sm mb-1">Couldn&apos;t load profile</p>
        <p className="text-white/40 text-xs mb-5 text-center max-w-sm">{loadError}</p>
        <button
          onClick={retryLoad}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className={isPage ? "h-full w-full flex flex-col items-center justify-center bg-[#050F1A]" : "flex flex-col items-center justify-center py-20"}>
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#62A0EA] rounded-full animate-spin" />
        <p className="text-white/40 text-xs mt-3">Loading your profile…</p>
      </div>
    );
  }

  const getStatusConfig = (status: AccountStatus) => {
    switch (status) {
      case "ACTIVE":
        return {
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          text: "Verified",
        };
      case "PENDING_VERIFICATION":
      case "PENDING":
        return {
          color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
          text: "Pending Verification",
        };
      case "DISCOUNT_REJECTED":
      case "REJECTED":
        return {
          color: "text-red-400 bg-red-500/10 border-red-500/30",
          text: "Rejected",
        };
      case "APPROVED":
        return {
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          text: "Approved",
        };
      default:
        return {
          color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
          text: status ?? "Unknown",
        };
    }
  };

  const statusConfig = getStatusConfig(profile.accountStatus);
  const discountPercentage = profile.commuterType === "REGULAR" ? 0 : 20;

  const inputClasses =
    "w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#62A0EA]/20 focus:border-[#62A0EA]";
  const disabledInputClasses = `${inputClasses} bg-[#050F1A] border-white/5 text-white/30 cursor-not-allowed`;
  const enabledInputClasses = `${inputClasses} bg-[#050F1A] border-white/10 text-white placeholder:text-white/30`;
  const errorInputClasses = `${inputClasses} bg-[#050F1A] border-red-500/50 text-white placeholder:text-white/30 focus:ring-red-500/20 focus:border-red-500`;

  const fieldClass = (
    field: "currentPassword" | "newPassword" | "confirmNewPassword" | "code"
  ) =>
    passwordErrorField === field ? errorInputClasses : enabledInputClasses;

  return (
    <div className={isPage ? "h-full w-full bg-[#050F1A] overflow-y-auto pb-28 lg:pb-8" : undefined}>
      <div className={isPage ? "max-w-2xl mx-auto p-6 lg:p-8 space-y-6" : "px-5 py-6 sm:px-6 space-y-6"}>
        {/* Header & Avatar */}
        <div className={isPage ? "flex flex-col sm:flex-row items-center gap-5" : "flex items-start gap-4 border-b border-white/10 pb-6"}>
          <div className={isPage ? "w-24 h-24 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-black text-3xl shadow-xl border-4 border-white/10 flex-shrink-0" : "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#62A0EA]/30 bg-[#1A5FB4]/20 text-xl font-bold text-[#99C1F1]"}>
            {profile.firstName[0]}
            {profile.surname[0]}
          </div>
          <div className={isPage ? "text-center sm:text-left flex-1" : "min-w-0 flex-1"}>
            <h1 className={isPage ? "text-white font-bold text-2xl" : "break-words text-white font-bold text-lg leading-snug"}>
              {profile.firstName} {profile.surname}
            </h1>
            <p className="text-white/50 text-sm mt-1 break-words">@{profile.username}</p>
            <div className={isPage ? "flex flex-wrap gap-2 mt-3 justify-center sm:justify-start" : "flex flex-wrap items-center gap-2 mt-3"}>
              <span
                className={`${isPage ? "text-[10px] font-bold uppercase tracking-wider" : "text-[11px] font-medium"} px-2.5 py-1 rounded-full border ${statusConfig.color}`}
              >
                {statusConfig.text}
              </span>
              <span className={isPage ? "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-[#62A0EA]/10 text-[#62A0EA] border-[#62A0EA]/30" : "text-xs text-white/60"}>
                {isPage ? profile.commuterType : getCommuterTypeLabel(profile.commuterType)}{" "}
                {isPage && discountPercentage > 0 && `(${discountPercentage}% Off)`}
              </span>
            </div>
          </div>
        </div>

        {/* Transient success banner */}
        {successMessage && (
          <div role="status" className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <svg
              className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-emerald-200 text-sm font-medium">
              {successMessage}
            </p>
          </div>
        )}

        {/* Verification Alert */}
        {profile.accountStatus === "PENDING_VERIFICATION" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <div>
              <p className="text-amber-200 text-sm font-bold">
                Verification Pending
              </p>
              <p className="text-amber-200/60 text-xs mt-0.5">
                Your discount is on hold until an admin verifies your uploaded
                ID.
              </p>
            </div>
          </div>
        )}

        {profile.accountStatus === "DISCOUNT_REJECTED" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-red-200 text-sm font-bold">
                Discount Application Rejected
              </p>
              <p className="text-red-200/60 text-xs mt-0.5 mb-2">
                The ID you uploaded for the{" "}
                <span className="font-bold text-red-300">
                  {profile.appliedType}
                </span>{" "}
                discount was not approved. Your account is active, but you are
                currently classified as a{" "}
                <span className="font-bold text-red-300">Regular</span>{" "}
                commuter. You can re-upload a valid ID to reapply.
              </p>
              <button
                onClick={handleReuploadId}
                className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg transition-colors"
              >
                Re-upload ID
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isPage ? <>
        <div className="flex gap-3">
          <button
            onClick={isEditing ? cancelEditing : startEditing}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors border ${
              isEditing
                ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                : "bg-[#1A5FB4] border-[#1A5FB4] text-white hover:bg-[#164A8F]"
            }`}
          >
            {isEditing ? "Cancel Editing" : "Edit Profile"}
          </button>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
          >
            Change Password
          </button>
        </div>

        {/* Profile Form */}
        <div className="bg-[#071A2E] border border-white/10 rounded-2xl p-6 space-y-5 shadow-lg">
          <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider">
            Personal Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                First Name
              </label>
              <input
                type="text"
                value={profile.firstName}
                disabled
                className={disabledInputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Surname
              </label>
              <input
                type="text"
                value={profile.surname}
                disabled
                className={disabledInputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Birthdate
              </label>
              <input
                type="text"
                value={new Date(profile.birthdate).toLocaleDateString(
                  "en-US",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
                disabled
                className={disabledInputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Commuter Type
              </label>
              <input
                type="text"
                value={profile.commuterType}
                disabled
                className={disabledInputClasses}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={
                  isEditing
                    ? (editData.email ?? profile.email)
                    : profile.email
                }
                onChange={(e) => handleEditChange("email", e.target.value)}
                disabled={!isEditing}
                className={isEditing ? enabledInputClasses : disabledInputClasses}
              />
              {isEditing && (
                <p className="text-[10px] text-white/30 mt-1">
                  Email changes are not saved — only contact number is
                  editable.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Contact Number
              </label>
              <input
                type="tel"
                value={
                  isEditing
                    ? (editData.contactNumber ?? profile.contactNumber)
                    : profile.contactNumber
                }
                onChange={(e) =>
                  handleEditChange("contactNumber", e.target.value)
                }
                disabled={!isEditing}
                maxLength={11}
                placeholder="09171234567"
                className={isEditing ? enabledInputClasses : disabledInputClasses}
              />
            </div>
          </div>

          {saveError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium p-3 rounded-lg">
              {saveError}
            </div>
          )}

          {isEditing && (
            <button
              onClick={saveProfile}
              disabled={isSaving}
              className="w-full mt-4 py-3 rounded-xl text-sm font-bold bg-[#FF6D3A] text-white hover:bg-[#e55a2b] transition-colors shadow-lg shadow-[#FF6D3A]/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                "Save Changes"
              )}
            </button>
          )}
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3 rounded-xl text-sm font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors mt-8"
        >
          Log Out
        </button>
        </> : <>
          <section aria-labelledby="profile-details-heading">
            <h3 id="profile-details-heading" className="text-sm font-semibold text-white">Personal details</h3>
            <dl className="mt-4 grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
              <div><dt className="text-xs text-white/50">First name</dt><dd className="mt-1 break-words text-sm text-white/90">{profile.firstName}</dd></div>
              <div><dt className="text-xs text-white/50">Surname</dt><dd className="mt-1 break-words text-sm text-white/90">{profile.surname}</dd></div>
              <div><dt className="text-xs text-white/50">Birthdate</dt><dd className="mt-1 text-sm text-white/90">{profile.birthdate && Number.isFinite(new Date(profile.birthdate).getTime()) ? new Date(profile.birthdate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "Not provided"}</dd></div>
              <div><dt className="text-xs text-white/50">Commuter type</dt><dd className="mt-1 text-sm text-white/90">{getCommuterTypeLabel(profile.commuterType)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-white/50">Email address</dt><dd className="mt-1 break-all text-sm text-white/90">{profile.email || "Not provided"}</dd></div>
            </dl>
          </section>

          <section aria-labelledby="profile-contact-heading" className="border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 id="profile-contact-heading" className="text-sm font-semibold text-white">Contact number</h3>
              {!isEditing && <button type="button" onClick={startEditing} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-medium text-[#99C1F1] hover:bg-white/5 hover:text-white"><Pencil size={14} /> Edit</button>}
            </div>
            {isEditing ? (
              <form onSubmit={event => { event.preventDefault(); if (!isSaving) void saveProfile(); }} className="mt-3">
                <label htmlFor="profile-modal-contact" className="sr-only">Contact number</label>
                <input id="profile-modal-contact" type="tel" inputMode="numeric" autoComplete="tel-national" autoFocus disabled={isSaving} value={editData.contactNumber ?? profile.contactNumber} onChange={event => handleEditChange("contactNumber", event.target.value)} maxLength={11} placeholder="09171234567" aria-invalid={!!saveError} aria-describedby={saveError ? "profile-modal-contact-error" : undefined} className={`${saveError ? errorInputClasses : enabledInputClasses} disabled:opacity-50`} />
                {saveError && <p id="profile-modal-contact-error" role="alert" className="mt-2 text-xs text-red-400">{saveError}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={cancelEditing} disabled={isSaving} className="min-h-10 rounded-lg border border-white/10 px-4 text-sm font-medium text-white/70 hover:bg-white/5 disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={isSaving || editData.contactNumber === profile.contactNumber} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1A5FB4] px-4 text-sm font-semibold text-white hover:bg-[#164A8F] disabled:opacity-50">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            ) : <p className="mt-1 text-sm text-white/90">{profile.contactNumber || "Not provided"}</p>}
          </section>

          <section aria-labelledby="profile-security-heading" className="border-t border-white/10 pt-5">
            <h3 id="profile-security-heading" className="mb-2 text-sm font-semibold text-white">Account security</h3>
            <button type="button" onClick={() => setShowPasswordModal(true)} className="flex min-h-12 w-full items-center gap-3 rounded-lg py-3 text-left text-sm text-white/80 hover:bg-white/5">
              <KeyRound size={18} className="shrink-0 text-white/50" /><span className="flex-1">Change password</span><ChevronRight size={16} className="text-white/40" />
            </button>
          </section>
          <div className="border-t border-white/10 pt-4">
            <button type="button" onClick={() => setShowLogoutConfirm(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-red-400 hover:bg-red-500/10"><LogOut size={17} /> Log out</button>
          </div>
        </>}
      </div>

      {/* --- LOG OUT CONFIRMATION --- */}
      {showLogoutConfirm && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowLogoutConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div
            ref={subdialogRef}
            data-profile-subdialog="logout"
            className="bg-[#071A2E] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-6 text-center animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </div>

            <h2 id="logout-confirm-title" className="text-white font-bold text-lg mt-4">
              Log out?
            </h2>
            <p className="text-white/50 text-sm mt-2">
              You&apos;ll need to sign in again to book rides, scan receipts and
              view your rewards.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- CHANGE PASSWORD MODAL --- */}
      {showPasswordModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={closePasswordModal}
        >
          <div
            ref={subdialogRef}
            data-profile-subdialog="password"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-password-title"
            className="bg-[#071A2E] w-full max-w-sm max-h-[90dvh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-y-auto modal-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 relative">
              <h2 id="profile-password-title" className="text-white font-bold text-lg pr-8">Change Password</h2>
              {!isPage && <button type="button" onClick={closePasswordModal} disabled={isChangingPassword} aria-label="Close change password" title="Close" className="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-50"><X size={18} /></button>}
              <p className="text-white/40 text-xs mt-1">
                {passwordStep === "form"
                  ? "Ensure your account stays secure"
                  : "Confirm it's you to finish changing your password"}
              </p>
            </div>

            {passwordStep === "form" ? (
              <>
                <div className="p-6 space-y-4">
                  {passwordError && (isPage || !passwordErrorField) && (
                    <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium p-3 rounded-lg">
                      {passwordError}
                    </div>
                  )}
                  <div>
                    <label htmlFor="profile-current-password" className="block text-xs font-medium text-white/50 mb-1.5">
                      Current Password
                    </label>
                    <input
                      id="profile-current-password"
                      aria-invalid={passwordErrorField === "currentPassword"}
                      aria-describedby={!isPage && passwordErrorField === "currentPassword" ? "profile-current-password-error" : undefined}
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                      className={fieldClass("currentPassword")}
                      autoComplete="current-password"
                    />
                    {!isPage && passwordErrorField === "currentPassword" && <p id="profile-current-password-error" role="alert" className="mt-2 text-xs text-red-400">{passwordError}</p>}
                  </div>
                  <div>
                    <label htmlFor="profile-new-password" className="block text-xs font-medium text-white/50 mb-1.5">
                      New Password
                    </label>
                    <input
                      id="profile-new-password"
                      aria-invalid={passwordErrorField === "newPassword"}
                      aria-describedby={!isPage && passwordErrorField === "newPassword" ? "profile-new-password-error" : "profile-password-rules"}
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                      className={fieldClass("newPassword")}
                      autoComplete="new-password"
                    />
                    {!isPage && passwordErrorField === "newPassword" && <p id="profile-new-password-error" role="alert" className="mt-2 text-xs text-red-400">{passwordError}</p>}
                    <p id="profile-password-rules" className="text-[10px] text-white/50 mt-1">
                      At least 8 characters, with an uppercase letter, a number and a symbol.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="profile-confirm-password" className="block text-xs font-medium text-white/50 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      id="profile-confirm-password"
                      aria-invalid={passwordErrorField === "confirmNewPassword"}
                      aria-describedby={!isPage && passwordErrorField === "confirmNewPassword" ? "profile-confirm-password-error" : undefined}
                      type="password"
                      value={passwordData.confirmNewPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmNewPassword: e.target.value,
                        }))
                      }
                      placeholder="••••••••"
                      className={fieldClass("confirmNewPassword")}
                      autoComplete="new-password"
                    />
                    {!isPage && passwordErrorField === "confirmNewPassword" && <p id="profile-confirm-password-error" role="alert" className="mt-2 text-xs text-red-400">{passwordError}</p>}
                  </div>
                </div>

                <div className="p-6 border-t border-white/10 flex gap-3">
                  <button
                    onClick={closePasswordModal}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestPasswordChangeCode}
                    disabled={
                      isChangingPassword ||
                      !passwordData.currentPassword ||
                      !passwordData.newPassword ||
                      !passwordData.confirmNewPassword
                    }
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-lg shadow-[#1A5FB4]/30 disabled:opacity-50"
                  >
                    {isChangingPassword ? "Sending code..." : "Send Code"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  {passwordError && (isPage || !passwordErrorField) && (
                    <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium p-3 rounded-lg">
                      {passwordError}
                    </div>
                  )}
                  <p className="text-white/40 text-xs">
                    We emailed a 6-digit code to your registered address. Enter it below to finish changing your password.
                  </p>
                  <div>
                    <label htmlFor="profile-verification-code" className="block text-xs font-medium text-white/50 mb-1.5">
                      Verification Code
                    </label>
                    <input
                      id="profile-verification-code"
                      aria-invalid={passwordErrorField === "code"}
                      aria-describedby={!isPage && passwordErrorField === "code" ? "profile-verification-code-error" : undefined}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="123456"
                      className={`${fieldClass("code")} text-center tracking-[0.5em] font-mono`}
                      autoComplete="one-time-code"
                    />
                    {!isPage && passwordErrorField === "code" && <p id="profile-verification-code-error" role="alert" className="mt-2 text-xs text-red-400">{passwordError}</p>}
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleBackToPasswordForm}
                      className="text-xs font-medium text-white/40 hover:text-white/60 transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleResendCode}
                      disabled={resendSecondsLeft > 0 || isChangingPassword}
                      className="text-xs font-medium text-[#62A0EA] hover:text-[#99C1F1] transition-colors disabled:text-white/20 disabled:cursor-not-allowed"
                    >
                      {resendSecondsLeft > 0
                        ? `Resend code in ${resendSecondsLeft}s`
                        : "Resend code"}
                    </button>
                  </div>
                </div>

                <div className="p-6 border-t border-white/10 flex gap-3">
                  <button
                    onClick={closePasswordModal}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPasswordChange}
                    disabled={isChangingPassword || verificationCode.length !== 6}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-lg shadow-[#1A5FB4]/30 disabled:opacity-50"
                  >
                    {isChangingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
