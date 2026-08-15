import { useCallback, useEffect, useState } from "react";
import { CommuterProfile, PasswordPayload } from "./types";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import {
  PasswordChangeError,
  changePassword,
  getProfile,
  updateProfile,
} from "@/lib/commuter/services/profile.service";

type LoadState = "loading" | "loaded" | "error";

type PasswordErrorField =
  | "currentPassword"
  | "newPassword"
  | "confirmNewPassword"
  | null;

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
  const [passwordData, setPasswordData] = useState<PasswordPayload>({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordErrorField, setPasswordErrorField] =
    useState<PasswordErrorField>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
    setEditData((prev) => ({ ...prev, [field]: value }));
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

  // ─── Change password ──────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordErrorField(null);

    // Client-side pre-flight — saves a round-trip on obvious mistakes
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      setPasswordErrorField("confirmNewPassword");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError(
        "Password must be at least 8 characters, with letters and numbers."
      );
      setPasswordErrorField("newPassword");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmNewPassword: passwordData.confirmNewPassword,
      });
      // Success — clear the form, close the modal, surface a confirmation
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setShowPasswordModal(false);
      setSuccessMessage("Password updated successfully.");
      window.setTimeout(() => setSuccessMessage(null), 4000);
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

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordError(null);
    setPasswordErrorField(null);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
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
    passwordData,
    setPasswordData,
    isChangingPassword,
    handleChangePassword,
    passwordError,
    passwordErrorField,
    closePasswordModal,
    // Misc
    successMessage,
    handleReuploadId,
    handleLogout,
  };
}
