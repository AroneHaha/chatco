import { useState, useEffect } from "react";
import { CommuterProfile, PasswordPayload } from "./types";

const MOCK_USER: CommuterProfile = {
  id: "c_001",
  firstName: "Arone",
  middleName: "Santos",
  surname: "Dela Cruz",
  birthdate: "2001-05-15",
  gender: "Male",
  email: "arone.delacruz@gmail.com",
  contactNumber: "09123456789",
  commuterType: "REGULAR", // Admin downgraded them to Regular
  username: "arone_dc",
  languagePreference: "English",
  accountStatus: "DISCOUNT_REJECTED", // Try changing to ACTIVE or PENDING_VERIFICATION
  idImageUrl: "/mock-id.jpg",
  verifiedAt: null,
  createdAt: "2026-03-10T10:00:00Z",
  balance: 487.50,
  appliedType: "STUDENT" // They originally applied as Student
};

export function useProfile() {
  const [profile, setProfile] = useState<CommuterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<CommuterProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordPayload>({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setProfile(MOCK_USER);
      setIsLoading(false);
    }, 500);
  }, []);

  const handleEditChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const startEditing = () => {
    if (!profile) return;
    setEditData({ email: profile.email, contactNumber: profile.contactNumber, languagePreference: profile.languagePreference });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
  };

  const saveProfile = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setProfile(prev => prev ? { ...prev, ...editData } : null);
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
    // Mock API: POST /api/commuter/change-password
    await new Promise(r => setTimeout(r, 1000));
    setIsChangingPassword(false);
    setShowPasswordModal(false);
    setPasswordData({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
    alert("Password changed successfully!");
  };

  const handleReuploadId = async () => {
    // Mock API: POST /api/commuter/upload-id
    // This would also change accountStatus back to PENDING_VERIFICATION
    alert("ID Re-uploaded. Waiting for admin verification.");
  };

  const handleLogout = () => {
    alert("Logging out...");
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordError(null);
    setPasswordData({ oldPassword: "", newPassword: "", confirmNewPassword: "" }); // Clears the inputs!
  };

  return {
    profile, isLoading, isEditing, editData, startEditing, cancelEditing, 
    saveProfile, isSaving, handleEditChange,
    showPasswordModal, setShowPasswordModal, passwordData, setPasswordData, 
    isChangingPassword, handleChangePassword, passwordError, closePasswordModal,
    handleReuploadId, handleLogout
  };
}