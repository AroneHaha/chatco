"use client";

import { useProfile } from "./use-profile";
import { AccountStatus } from "./types";
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const {
    profile, isLoading, isEditing, editData, startEditing, cancelEditing, 
    saveProfile, isSaving, handleEditChange,
    showPasswordModal, setShowPasswordModal, passwordData, setPasswordData, 
    isChangingPassword, handleChangePassword, passwordError,
    handleReuploadId, handleLogout
  } = useProfile();

  if (isLoading || !profile) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#050F1A]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#62A0EA] rounded-full animate-spin" />
      </div>
    );
  }

  const getStatusConfig = (status: AccountStatus) => {
    switch (status) {
      case "ACTIVE": return { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", text: "Verified" };
      case "PENDING_VERIFICATION": return { color: "text-amber-400 bg-amber-500/10 border-amber-500/30", text: "Pending Verification" };
      case "DISCOUNT_REJECTED": return { color: "text-red-400 bg-red-500/10 border-red-500/30", text: "Discount Rejected" };
    }
  };

  const statusConfig = getStatusConfig(profile.accountStatus);
  const discountPercentage = profile.commuterType === "REGULAR" ? 0 : 20;

  const inputClasses = "w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#62A0EA]/20 focus:border-[#62A0EA]";
  const disabledInputClasses = `${inputClasses} bg-[#050F1A] border-white/5 text-white/30 cursor-not-allowed`;
  const enabledInputClasses = `${inputClasses} bg-[#050F1A] border-white/10 text-white placeholder:text-white/30`;

  return (
    <div className="h-full w-full bg-[#050F1A] overflow-y-auto pb-28 lg:pb-8">
      <div className="max-w-2xl mx-auto p-6 lg:p-8 space-y-6">
        
        {/* Header & Avatar */}
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-24 h-24 rounded-full bg-[#1A5FB4] flex items-center justify-center text-white font-black text-3xl shadow-xl border-4 border-white/10 flex-shrink-0">
            {profile.firstName[0]}{profile.surname[0]}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-white font-bold text-2xl">{profile.firstName} {profile.surname}</h1>
            <p className="text-white/40 text-sm mt-1">@{profile.username}</p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusConfig.color}`}>
                {statusConfig.text}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-[#62A0EA]/10 text-[#62A0EA] border-[#62A0EA]/30">
                {profile.commuterType} {discountPercentage > 0 && `(${discountPercentage}% Off)`}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Alert */}
        {profile.accountStatus === "PENDING_VERIFICATION" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <div>
              <p className="text-amber-200 text-sm font-bold">Verification Pending</p>
              <p className="text-amber-200/60 text-xs mt-0.5">Your discount is on hold until an admin verifies your uploaded ID.</p>
            </div>
          </div>
        )}

        {profile.accountStatus === "DISCOUNT_REJECTED" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="flex-1">
              <p className="text-red-200 text-sm font-bold">Discount Application Rejected</p>
              <p className="text-red-200/60 text-xs mt-0.5 mb-2">
                The ID you uploaded for the <span className="font-bold text-red-300">{profile.appliedType}</span> discount was not approved. Your account is active, but you are currently classified as a <span className="font-bold text-red-300">Regular</span> commuter. You can re-upload a valid ID to reapply.
              </p>
              <button onClick={handleReuploadId} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg transition-colors">
                Re-upload ID
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={isEditing ? cancelEditing : startEditing}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors border ${isEditing ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-[#1A5FB4] border-[#1A5FB4] text-white hover:bg-[#164A8F]"}`}
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
          <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider">Personal Information</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">First Name</label>
              <input type="text" value={profile.firstName} disabled className={disabledInputClasses} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Surname</label>
              <input type="text" value={profile.surname} disabled className={disabledInputClasses} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Birthdate</label>
              <input type="text" value={new Date(profile.birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} disabled className={disabledInputClasses} />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Commuter Type</label>
              <input type="text" value={profile.commuterType} disabled className={disabledInputClasses} />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Email Address</label>
              <input 
                type="email" 
                value={isEditing ? (editData.email ?? profile.email) : profile.email} 
                onChange={(e) => handleEditChange('email', e.target.value)}
                disabled={!isEditing} 
                className={isEditing ? enabledInputClasses : disabledInputClasses} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Contact Number</label>
              <input 
                type="tel" 
                value={isEditing ? (editData.contactNumber ?? profile.contactNumber) : profile.contactNumber} 
                onChange={(e) => handleEditChange('contactNumber', e.target.value)}
                disabled={!isEditing} 
                className={isEditing ? enabledInputClasses : disabledInputClasses} 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Language Preference</label>
              <select 
                value={isEditing ? (editData.languagePreference ?? profile.languagePreference) : profile.languagePreference} 
                onChange={(e) => handleEditChange('languagePreference', e.target.value)}
                disabled={!isEditing} 
                className={isEditing ? enabledInputClasses : disabledInputClasses}
              >
                <option value="English">English</option>
                <option value="Filipino">Filipino</option>
              </select>
            </div>
          </div>

          {isEditing && (
            <button 
              onClick={saveProfile}
              disabled={isSaving}
              className="w-full mt-4 py-3 rounded-xl text-sm font-bold bg-[#FF6D3A] text-white hover:bg-[#e55a2b] transition-colors shadow-lg shadow-[#FF6D3A]/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : "Save Changes"}
            </button>
          )}
        </div>

        <button 
          onClick={handleLogout}
          className="w-full py-3 rounded-xl text-sm font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors mt-8"
        >
          Log Out
        </button>

      </div>

      {/* --- CHANGE PASSWORD MODAL --- */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-[#071A2E] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            
            <div className="p-6 border-b border-white/10">
              <h2 className="text-white font-bold text-lg">Change Password</h2>
              <p className="text-white/40 text-xs mt-1">Ensure your account stays secure</p>
            </div>

            <div className="p-6 space-y-4">
              {passwordError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium p-3 rounded-lg">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Current Password</label>
                <input 
                  type="password" 
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                  placeholder="••••••••"
                  className={enabledInputClasses}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">New Password</label>
                <input 
                  type="password" 
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="••••••••"
                  className={enabledInputClasses}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Confirm New Password</label>
                <input 
                  type="password" 
                  value={passwordData.confirmNewPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                  placeholder="••••••••"
                  className={enabledInputClasses}
                />
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex gap-3">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/60 hover:bg-white/5 transition-colors">Cancel</button>
              <button 
                onClick={handleChangePassword}
                disabled={isChangingPassword || !passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmNewPassword}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-lg shadow-[#1A5FB4]/30 disabled:opacity-50"
              >
                {isChangingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}