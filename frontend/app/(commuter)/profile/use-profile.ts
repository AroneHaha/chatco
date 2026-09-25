import { useCallback, useEffect, useRef, useState } from "react";
import { CommuterProfile, PasswordPayload } from "./types";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import {
  PasswordChangeError,
  requestPasswordChangeCode,
  confirmPasswordChange,
  getProfile,
  updateProfile,
} from "@/lib/commuter/services/profile.service";
import {
  CONTACT_NUMBER_PATTERN,
  CONTACT_NUMBER_ERROR,
  formatContactNumberInput,
} from "@/lib/utils/format";

type LoadState = "loading" | "loaded" | "error";

type PasswordErrorField =
  | "currentPassword"
  | "newPassword"
  | "confirmNewPassword"
  | "code"
  | null;

/**
 * "form"   — collecting current/new password, before a code has been sent.
 * "verify" — a code was emailed; collecting it to actually apply the change.
 */
type PasswordStep = "form" | "verify";

/**
 * Hook backing the commuter Profile page (S5-T9).
 *
 * Wires the page to the real backend (S5-T1) via lib/commuter/services/profile.service.
 * No mock data — every state is sourced from the API.
 *
 * Responsibilities:
 *   - Load the profile on mount (with retry on transient failure)
 *   - Bind the edit form to PUT /api/commuter/profile
 *   - Bind the change-password modal to POST /api/commuter/change-password
 *   - Translate backend error codes into actionable UI state (field-level
 *     errors, session-expired redirect, friendly network messages)
 *
 * NOTE: We deliberately do NOT seed `profile` from `useAuth().commuterProfile`
 * even though it's available. That value comes from `/api/auth/me` which
 * returns a SNAKE_CASE partial payload ({first_name, surname, ...}), whereas
 * the page expects camelCase fields ({firstName, surname, ...}). Seeding from
 * it would render "undefined undefined" for the user's name during the brief
 * window before /api/commuter/profile resolves. Always fetch fresh from the
 * dedicated profile endpoint, which the service maps to the correct shape.
 */
export function useProfile() {
  const { logout: authLogout } = useAuth();

  // ─── Load state ───────────────────────────────────────────────────
  const [profile, setProfile] = useState<CommuterProfile | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Edit form state ──────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<CommuterProfile>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Change-password modal state ──────────────────────────────────
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState<PasswordStep>("form");
  const [passwordData, setPasswordData] = useState<PasswordPayload>({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordErrorField, setPasswordErrorField] =
    useState<PasswordErrorField>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ticks resendSecondsLeft down to 0 once a code has been sent, so the
  // "Resend code" button re-enables itself without a page interaction.
  useEffect(() => {
    if (resendSecondsLeft <= 0) {
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
        resendTimerRef.current = null;
      }
      return;
    }
    resendTimerRef.current = setInterval(() => {
      setResendSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resendSecondsLeft > 0]);

  // ─── Transient success banner (password change, ID re-upload notice) ──
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ─── Load profile from API ────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      const fresh = await getProfile();
      setProfile(fresh);
      setLoadState("loaded");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Session expired — hand off to auth context (clears cookie +
        // redirects to /login).
        authLogout();
        return;
      }
      setLoadState("error");
      setLoadError(
        err instanceof ApiError && err.status === 404
          ? "Profile not found. Please contact support."
          : "Couldn't load your profile. Please check your connection and try again."
      );
    }
  }, [authLogout]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ─── Edit handlers ────────────────────────────────────────────────
  const handleEditChange = (field: string, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [field]: field === "contactNumber" ? formatContactNumberInput(value) : value,
    }));
    setSaveError(null);
  };

  const startEditing = () => {
    if (!profile) return;
    setEditData({
      email: profile.email,
      contactNumber: profile.contactNumber,
    });
    setSaveError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
    setSaveError(null);
  };

  const saveProfile = async () => {
    if (!profile) return;

    // Client-side pre-flight — saves a round-trip on an obviously malformed number.
    const contactNumber = editData.contactNumber ?? profile.contactNumber;
    if (!CONTACT_NUMBER_PATTERN.test(contactNumber)) {
      setSaveError(CONTACT_NUMBER_ERROR);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProfile({
        contactNumber: editData.contactNumber,
      });
      setProfile(updated);
      setIsEditing(false);
      setEditData({});
      setSuccessMessage("Profile updated.");
      window.setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          authLogout();
          return;
        }
        if (err.status === 422) {
          const body = err.body as {
            errors?: Record<string, string[]>;
            message?: string;
          };
          const firstError = body.errors
            ? Object.values(body.errors)[0]?.[0]
            : undefined;
          setSaveError(
            firstError ?? "Please check the fields and try again."
          );
        } else {
          setSaveError("Couldn't save your profile. Please try again.");
        }
      } else {
        setSaveError("Network error. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Change password (phase 1: request the emailed code) ──────────
  const handleRequestPasswordChangeCode = async () => {
    setPasswordError(null);
    setPasswordErrorField(null);

    // Client-side pre-flight — saves a round-trip on obvious mistakes
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      setPasswordErrorField("confirmNewPassword");
      return;
    }
    // Same rule and wording as the backend's StrongPassword (also used by
    // signup and Forgot Password), so the message matches either way.
    const newPassword = passwordData.newPassword;
    const missing = [
      newPassword.length < 8 && "at least 8 characters",
      !/[A-Z]/.test(newPassword) && "an uppercase letter",
      !/[0-9]/.test(newPassword) && "a number",
      !/[^A-Za-z0-9\s]/.test(newPassword) && "a symbol (like ! ? @ #)",
    ].filter((item): item is string => Boolean(item));
    if (missing.length > 0) {
      const joined = missing.length === 1
        ? missing[0]
        : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
      setPasswordError(`Your password needs ${joined}.`);
      setPasswordErrorField("newPassword");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { resendInSeconds } = await requestPasswordChangeCode({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword,
      });
      // Current/new password are valid — move to the code-entry step. The
      // password itself is NOT changed yet.
      setVerificationCode("");
      setResendSecondsLeft(resendInSeconds);
      setPasswordStep("verify");
    } catch (err) {
      if (err instanceof PasswordChangeError) {
        setPasswordError(err.message);
        setPasswordErrorField(err.field ?? null);
        if (err.code === "unauthenticated") {
          // Session expired — let the user read the message, then redirect
          window.setTimeout(() => authLogout(), 1500);
        }
      } else {
        setPasswordError("Something went wrong. Please try again.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ─── Change password (phase 2: verify the code, apply the change) ─
  const handleConfirmPasswordChange = async () => {
    setPasswordError(null);
    setPasswordErrorField(null);

    if (!verificationCode.trim()) {
      setPasswordError("Enter the code we emailed you.");
      setPasswordErrorField("code");
      return;
    }

    setIsChangingPassword(true);
    try {
      await confirmPasswordChange({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword,
        code: verificationCode.trim(),
      });
      // Success — clear the form, close the modal, surface a confirmation
      closePasswordModal();
      setSuccessMessage("Password updated successfully.");
      window.setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      if (err instanceof PasswordChangeError) {
        setPasswordError(err.message);
        setPasswordErrorField(err.field ?? null);
        if (err.code === "unauthenticated") {
          // Session expired — let the user read the message, then redirect
          window.setTimeout(() => authLogout(), 1500);
        } else if (err.field === "currentPassword" || err.field === "newPassword") {
          // The account/policy changed since phase 1 (e.g. password changed
          // from another device) — send them back to fix the form rather
          // than retrying a code against a request that's no longer valid.
          setPasswordStep("form");
        }
      } else {
        setPasswordError("Something went wrong. Please try again.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ─── Resend the code without leaving the verify step ───────────────
  const handleResendCode = async () => {
    if (resendSecondsLeft > 0 || isChangingPassword) return;

    setPasswordError(null);
    setPasswordErrorField(null);
    setIsChangingPassword(true);
    try {
      const { resendInSeconds } = await requestPasswordChangeCode({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword,
      });
      setVerificationCode("");
      setResendSecondsLeft(resendInSeconds);
    } catch (err) {
      if (err instanceof PasswordChangeError) {
        setPasswordError(err.message);
        setPasswordErrorField(err.field ?? null);
      } else {
        setPasswordError("Something went wrong. Please try again.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Back to the form step to fix current/new password without closing the
  // modal — the emailed code for the previous attempt is left to expire.
  const handleBackToPasswordForm = () => {
    setPasswordStep("form");
    setVerificationCode("");
    setPasswordError(null);
    setPasswordErrorField(null);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordStep("form");
    setPasswordError(null);
    setPasswordErrorField(null);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setVerificationCode("");
    setResendSecondsLeft(0);
  };

  // ─── Misc ─────────────────────────────────────────────────────────
  const handleReuploadId = async () => {
    // ID re-upload is not yet available as a self-service flow.
    // Direct the commuter to contact admin support for now.
    setSuccessMessage(
      "To re-upload your valid ID, please visit the nearest CHATCO terminal or contact admin support. Self-service re-upload will be available in a future update."
    );
    window.setTimeout(() => setSuccessMessage(null), 6000);
  };

  const handleLogout = () => {
    authLogout();
  };

  const retryLoad = () => {
    loadProfile();
  };

  return {
    // Data
    profile,
    loadState,
    loadError,
    retryLoad,
    // Edit
    isEditing,
    editData,
    startEditing,
    cancelEditing,
    saveProfile,
    isSaving,
    saveError,
    handleEditChange,
    // Password
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
    // Misc
    successMessage,
    handleReuploadId,
    handleLogout,
  };
}
