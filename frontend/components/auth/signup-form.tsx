"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    surname: "",
    firstName: "",
    middleName: "",
    birthdate: "",
    gender: "",
    email: "",
    contactNumber: "",
    commuterType: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    setIsLoading(true);
    console.log("Signing up:", formData, "File:", fileName);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F8FAFC] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A5FB4]/20 focus:border-[#1A5FB4] transition-all";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div>
      {/* Tighter header spacing */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-[#071A2E] tracking-tight">Create Commuter Account</h2>
        <p className="mt-1.5 text-sm text-gray-500">Fill in your details below to get started</p>
      </div>

      {/* Reduced space between sections from space-y-8 to space-y-6 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: Personal Information */}
        <div>
          <h3 className="text-xs font-semibold text-[#1A5FB4] uppercase tracking-widest mb-3">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="firstName" className={labelClasses}>First Name *</label>
              <input id="firstName" name="firstName" type="text" required value={formData.firstName} onChange={handleChange} className={inputClasses} placeholder="Juan" />
            </div>
            <div>
              <label htmlFor="middleName" className={labelClasses}>Middle Name</label>
              <input id="middleName" name="middleName" type="text" value={formData.middleName} onChange={handleChange} className={inputClasses} placeholder="Santos" />
            </div>
            <div>
              <label htmlFor="surname" className={labelClasses}>Surname *</label>
              <input id="surname" name="surname" type="text" required value={formData.surname} onChange={handleChange} className={inputClasses} placeholder="Dela Cruz" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label htmlFor="birthdate" className={labelClasses}>Birthdate *</label>
              <input id="birthdate" name="birthdate" type="date" required value={formData.birthdate} onChange={handleChange} className={inputClasses} />
            </div>
            <div>
              <label htmlFor="gender" className={labelClasses}>Gender *</label>
              <select id="gender" name="gender" required value={formData.gender} onChange={handleChange} className={inputClasses}>
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label htmlFor="commuterType" className={labelClasses}>Commuter Type *</label>
              <select id="commuterType" name="commuterType" required value={formData.commuterType} onChange={handleChange} className={inputClasses}>
                <option value="" disabled>Select Type</option>
                <option value="Regular">Regular</option>
                <option value="Student">Student</option>
                <option value="Senior Citizen">Senior Citizen</option>
                <option value="PWD">PWD</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Contact & Verification */}
        <div>
          <h3 className="text-xs font-semibold text-[#1A5FB4] uppercase tracking-widest mb-3">Contact & Verification</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className={labelClasses}>Email Address *</label>
              <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className={inputClasses} placeholder="juandelacruz@gmail.com" />
            </div>
            <div>
              <label htmlFor="contactNumber" className={labelClasses}>Contact Number *</label>
              <input id="contactNumber" name="contactNumber" type="tel" required value={formData.contactNumber} onChange={handleChange} className={inputClasses} placeholder="0912 345 6789" />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClasses}>Valid ID Upload *</label>
            <label 
              htmlFor="validId" 
              className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${
                fileName 
                  ? "border-green-400 bg-green-50 hover:bg-green-100" 
                  : "border-[#1A5FB4]/30 bg-[#F8FAFC] hover:bg-[#F0F7FF]"
              }`}
            >
              <input id="validId" name="validId" type="file" accept="image/*,.pdf" required onChange={handleFileChange} className="hidden" />
              
              {fileName ? (
                <>
                  <svg className="w-7 h-7 text-green-500 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="text-sm font-medium text-green-700 max-w-xs truncate px-4 text-center">{fileName}</span>
                  <span className="text-xs text-green-500 mt-0.5">Click to change file</span>
                </>
              ) : (
                <>
                  <svg className="w-7 h-7 text-[#1A5FB4]/50 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-sm text-gray-500">Click to upload ID (JPG, PNG, PDF)</span>
                </>
              )}
            </label>
            <p className="text-[11px] text-gray-400 mt-1.5">Selecting Student, Senior, or PWD requires valid verification ID.</p>
          </div>
        </div>

        {/* SECTION 3: Account Credentials */}
        <div>
          <h3 className="text-xs font-semibold text-[#1A5FB4] uppercase tracking-widest mb-3">Account Credentials</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label htmlFor="username" className={labelClasses}>Username *</label>
              <input id="username" name="username" type="text" required value={formData.username} onChange={handleChange} className={inputClasses} placeholder="juandelacruz_01" />
            </div>
            <div>
              <label htmlFor="password" className={labelClasses}>Password *</label>
              <input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} className={inputClasses} placeholder="••••••••" />
            </div>
            <div>
              <label htmlFor="confirmPassword" className={labelClasses}>Confirm Password *</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} className={inputClasses} placeholder="••••••••" />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#1A5FB4] hover:text-[#164A8F]">
          Sign in instead
        </Link>
      </p>
    </div>
  );
}