import { useState, useEffect } from "react";
import { CommuterProfile, PasswordPayload } from "./types";
import { useAuth } from "@/contexts/auth-context";

const MOCK_USER: CommuterProfile = {
  id: "c_001",
  firstName: "Arone",
  middleName: "Santos",
  surname: "Dela Cruz",
  birthdate: "2001-05-15",
  gender: "Male",
  email: "arone.delacruz@gmail.com",
  contactNumber: "09123456789",
  commuterType: "REGULAR",
  username: "arone_dc",
  languagePreference: "English",
  accountStatus: "DISCOUNT_REJECTED",
  idImageUrl: "/mock-id.jpg",
  verifiedAt: null,
  createdAt: "2026-03-10T10:00:00Z",
  appliedType: "STUDENT",
};

export function useProfile() {
  const { logout: authLogout, commuterProfile: authProfile } = useAuth();
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

  useEffect(() => {
    // If auth context has a profile, use it instead of mock
    if (authProfile) {
      setProfile(authProfile);
      setIsLoading(false);
      return;
    }
    // Fallback: load mock profile (prototype phase)
    setTimeout(() => {
      setProfile(MOCK_USER);
      setIsLoading(false);
    }, 500);
  }, [authProfile]);

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
    alert("ID Re-uploaded. Waiting for admin verification.");
  };

  const handleLogout = () => {
    // Use auth context for proper session cleanup (clears httpOnly cookie too)
    authLogout();
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
    isLoading,
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
    handleLogout,
  };
}
