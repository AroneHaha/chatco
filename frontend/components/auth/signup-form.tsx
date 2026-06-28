"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { register, type AppliedType, RegisterError } from "@/lib/auth/register";

// Map the form's display labels to the backend's enum values
const COMMUTER_TYPE_OPTIONS: { label: string; value: AppliedType }[] = [
  { label: "Regular", value: "REGULAR" },
  { label: "Student", value: "STUDENT" },
  { label: "Senior Citizen", value: "SENIOR" },
  { label: "PWD", value: "PWD" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function SignupForm() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    surname: "",
    firstName: "",
    middleName: "",
    birthdate: "",
    gender: "",
    email: "",
    contactNumber: "",
    appliedType: "" as AppliedType | "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [idImage, setIdImage] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear field-specific error when user edits
    if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[e.target.name]; return next; });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setIdImage(null);
      setFileName(null);
      return;
    }

    // Client-side validation
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("Invalid file type. Please upload a JPG, PNG, or WebP image.");
      setIdImage(null);
      setFileName(null);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Maximum size is 5MB.");
      setIdImage(null);
      setFileName(null);
      return;
    }

    setIdImage(file);
    setFileName(file.name);
  };

  // Whether the selected commuter type requires an ID upload
  const requiresId = formData.appliedType && formData.appliedType !== "REGULAR";

  const validateStep = (stepNum: number): boolean => {
    if (stepNum === 1) {
      if (!formData.firstName || !formData.surname || !formData.birthdate || !formData.gender || !formData.appliedType) {
        setServerError("Please fill out all required personal information.");
        return false;
      }
    }
    if (stepNum === 2) {
      if (!formData.email || !formData.contactNumber) {
        setServerError("Please provide your email and contact number.");
        return false;
      }
      // ID is required for non-REGULAR types (Student, Senior, PWD)
      if (requiresId && !idImage) {
        setFileError("A valid ID is required for Student, Senior, or PWD registration.");
        return false;
      }
      // For REGULAR, ID is still required by the backend
      if (!idImage) {
        setFileError("A valid ID image is required to complete registration.");
        return false;
      }
    }
    setServerError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep(step + 1);
  };

  const handlePrev = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ password: ["Passwords do not match."] });
      return;
    }
    if (!idImage) {
      setFileError("A valid ID image is required.");
      return;
    }

    setIsLoading(true);
    setServerError(null);
    setFieldErrors({});

    try {
      await register({
        first_name: formData.firstName,
        middle_name: formData.middleName || undefined,
        surname: formData.surname,
        birthdate: formData.birthdate,
        gender: formData.gender,
        email: formData.email,
        contact_number: formData.contactNumber,
        username: formData.username,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        applied_type: formData.appliedType as AppliedType,
        id_image: idImage,
      });

      // Success — show pending review screen (no auto-login)
      setIsSuccess(true);
    } catch (err) {
      if (err instanceof RegisterError) {
        setServerError(err.message);
        setFieldErrors(err.errors);
      } else {
        setServerError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success: Pending Review Screen ──
  if (isSuccess) {
    return (
      <div className="min-h-[520px] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#071A2E] mb-3">Registration Submitted!</h2>
        <p className="text-base text-gray-500 max-w-md mb-2">
          Your account is <span className="font-semibold text-amber-600">pending admin approval</span>.
          An administrator will review your valid ID and verify your discount tier.
        </p>
        <p className="text-sm text-gray-400 max-w-md mb-8">
          You will receive an email once your account is approved. You cannot log in until then.
        </p>
        <Link
          href="/login"
          className="px-8 py-3.5 rounded-xl text-base font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  const inputClasses = "w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-[#F8FAFC] text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A5FB4]/20 focus:border-[#1A5FB4] transition-all";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-2";
  const errorClasses = "text-sm text-red-500 mt-1.5";

  // Helper to get field error (maps form field names to backend field names)
  const getFieldError = (formField: string, backendField?: string): string | null => {
    const key = backendField ?? formField;
    return fieldErrors[key]?.[0] ?? null;
  };

  return (
    <div className="min-h-[520px] flex flex-col">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-3 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step >= s ? "bg-[#1A5FB4] text-white shadow-md shadow-[#1A5FB4]/30" : "bg-gray-100 text-gray-400"
            }`}>{s}</div>
            {s < 3 && <div className={`w-20 h-1 rounded-full transition-all ${step > s ? "bg-[#1A5FB4]" : "bg-gray-100"}`} />}
          </div>
        ))}
      </div>

      {/* Dynamic Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-[#071A2E] tracking-tight">
          {step === 1 && "Personal Information"}
          {step === 2 && "Contact & Verification"}
          {step === 3 && "Account Credentials"}
        </h2>
        <p className="mt-2 text-base text-gray-500">
          {step === 1 && "Tell us a bit about yourself"}
          {step === 2 && "We need this for verification"}
          {step === 3 && "Secure your account"}
        </p>
      </div>

      {/* Server Error Banner */}
      {serverError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm text-red-600 font-medium">{serverError}</p>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1">
          {/* STEP 1 — Personal Info */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="firstName" className={labelClasses}>First Name *</label>
                  <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange} className={`${inputClasses} ${getFieldError("first_name") ? "border-red-300" : ""}`} placeholder="Juan" />
                  {getFieldError("first_name") && <p className={errorClasses}>{getFieldError("first_name")}</p>}
                </div>
                <div>
                  <label htmlFor="middleName" className={labelClasses}>Middle Name</label>
                  <input id="middleName" name="middleName" type="text" value={formData.middleName} onChange={handleChange} className={inputClasses} placeholder="Santos" />
                </div>
                <div>
                  <label htmlFor="surname" className={labelClasses}>Surname *</label>
                  <input id="surname" name="surname" type="text" value={formData.surname} onChange={handleChange} className={`${inputClasses} ${getFieldError("surname") ? "border-red-300" : ""}`} placeholder="Dela Cruz" />
                  {getFieldError("surname") && <p className={errorClasses}>{getFieldError("surname")}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="birthdate" className={labelClasses}>Birthdate *</label>
                  <input id="birthdate" name="birthdate" type="date" value={formData.birthdate} onChange={handleChange} className={inputClasses} />
                  {getFieldError("birthdate") && <p className={errorClasses}>{getFieldError("birthdate")}</p>}
                </div>
                <div>
                  <label htmlFor="gender" className={labelClasses}>Gender *</label>
                  <select id="gender" name="gender" value={formData.gender} onChange={handleChange} className={inputClasses}>
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="appliedType" className={labelClasses}>Commuter Type *</label>
                  <select id="appliedType" name="appliedType" value={formData.appliedType} onChange={handleChange} className={inputClasses}>
                    <option value="" disabled>Select Type</option>
                    {COMMUTER_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {getFieldError("applied_type", "appliedType") && <p className={errorClasses}>{getFieldError("applied_type", "appliedType")}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Contact + ID Upload */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className={labelClasses}>Email Address *</label>
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={`${inputClasses} ${getFieldError("email") ? "border-red-300" : ""}`} placeholder="juandelacruz@gmail.com" />
                  {getFieldError("email") && <p className={errorClasses}>{getFieldError("email")}</p>}
                </div>
                <div>
                  <label htmlFor="contactNumber" className={labelClasses}>Contact Number *</label>
                  <input id="contactNumber" name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleChange} className={`${inputClasses} ${getFieldError("contact_number", "contactNumber") ? "border-red-300" : ""}`} placeholder="0912 345 6789" />
                  {getFieldError("contact_number", "contactNumber") && <p className={errorClasses}>{getFieldError("contact_number", "contactNumber")}</p>}
                </div>
              </div>
              <div>
                <label className={labelClasses}>Valid ID Upload *</label>
                <label htmlFor="validId" className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer ${
                  fileError ? "border-red-300 bg-red-50" : fileName ? "border-green-400 bg-green-50 hover:bg-green-100" : "border-[#1A5FB4]/30 bg-[#F8FAFC] hover:bg-[#F0F7FF]"
                }`}>
                  <input ref={fileInputRef} id="validId" name="validId" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
                  {fileName ? (
                    <>
                      <svg className="w-10 h-10 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span className="text-base font-medium text-green-700 max-w-xs truncate px-4 text-center">{fileName}</span>
                      <span className="text-sm text-green-500 mt-1">Click to change file</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-10 h-10 text-[#1A5FB4]/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                      <span className="text-base text-gray-500">Click to upload ID (JPG, PNG, WebP — max 5MB)</span>
                    </>
                  )}
                </label>
                {fileError && <p className={errorClasses}>{fileError}</p>}
                {getFieldError("id_image") && <p className={errorClasses}>{getFieldError("id_image")}</p>}
                <p className="text-xs text-gray-400 mt-2">A valid ID is required for all registrations. Student, Senior, or PWD selections require a matching valid ID.</p>
              </div>
            </div>
          )}

          {/* STEP 3 — Credentials */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <label htmlFor="username" className={labelClasses}>Username *</label>
                <input id="username" name="username" type="text" value={formData.username} onChange={handleChange} className={`${inputClasses} ${getFieldError("username") ? "border-red-300" : ""}`} placeholder="juandelacruz_01" />
                {getFieldError("username") && <p className={errorClasses}>{getFieldError("username")}</p>}
              </div>
              <div>
                <label htmlFor="password" className={labelClasses}>Password *</label>
                <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className={`${inputClasses} ${getFieldError("password") ? "border-red-300" : ""}`} placeholder="••••••••" />
                {getFieldError("password") && <p className={errorClasses}>{getFieldError("password")}</p>}
              </div>
              <div>
                <label htmlFor="confirmPassword" className={labelClasses}>Confirm Password *</label>
                <input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className={`${inputClasses} ${getFieldError("password") ? "border-red-300" : ""}`} placeholder="••••••••" />
                {getFieldError("password") && !getFieldError("password_confirmation") && <p className={errorClasses}>{getFieldError("password")}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-10 flex gap-4">
          {step > 1 && (
            <button type="button" onClick={handlePrev} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
              Back
            </button>
          )}
          {step < 3 ? (
            <button type="button" onClick={handleNext} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20">
              Next Step
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </button>
          ) : (
            <button type="submit" disabled={isLoading} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20 disabled:opacity-70 disabled:cursor-not-allowed">
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Create Account"}
            </button>
          )}
        </div>
      </form>

      <p className="mt-8 text-center text-base text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#1A5FB4] hover:text-[#164A8F]">Sign in instead</Link>
      </p>
    </div>
  );
}
