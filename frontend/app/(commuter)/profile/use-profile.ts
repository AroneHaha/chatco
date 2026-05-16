// app/(commuter)/profile/use-profile.ts
// Uses auth context for profile data instead of hardcoded MOCK_USER.
// When Laravel backend is live, the auth context will provide real data.

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { CommuterProfile, AccountStatus } from "@/types";
import type { PasswordPayload } from "./types";

export function useProfile() {
  const { commuterProfile: authProfile, isLoading: authLoading, logout } = useAuth();
  const [profile, setProfile] = useState<CommuterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<CommuterProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordPayload>({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load profile from auth context
  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
      setIsLoading(false);
    } else if (!authLoading) {
      // Auth finished but no profile — still loading or error
      setIsLoading(false);
    }
  }, [authProfile, authLoading]);

  const handleEditChange = (field: string, value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const startEditing = () => {
    if (!profile) return;
    setEditData({
      email: profile.email,
      contactNumber: profile.contactNumber,
      languagePreference: profile.languagePreference,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  const saveProfile = async () => {
    setIsSaving(true);
    // TODO: Replace with real API call: PUT /api/commuter/profile
    await new Promise((r) => setTimeout(r, 800));
    setProfile((prev) => (prev ? { ...prev, ...editData } : null));
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    setIsChangingPassword(true);
    // TODO: Replace with real API call: POST /api/commuter/change-password
    await new Promise((r) => setTimeout(r, 1000));
    setIsChangingPassword(false);
    setShowPasswordModal(false);
    setPasswordData({
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    alert("Password changed successfully!");
  };

  const handleReuploadId = async () => {
    // TODO: Replace with real API call: POST /api/commuter/reupload-id
    alert("ID Re-uploaded. Waiting for admin verification.");
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordError(null);
    setPasswordData({
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  };

  return {
    profile,
    isLoading: isLoading || authLoading,
    isEditing,
    editData,
    startEditing,
    cancelEditing,
    saveProfile,
    isSaving,
    handleEditChange,
    showPasswordModal,
    setShowPasswordModal,
    passwordData,
    setPasswordData,
    isChangingPassword,
    handleChangePassword,
    passwordError,
    closePasswordModal,
    handleReuploadId,
    handleLogout: logout,
  };
}
