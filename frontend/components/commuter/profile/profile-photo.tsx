"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { uploadProfilePhoto } from "@/lib/commuter/services/profile.service";
import type { CommuterProfile } from "@/types";

export default function ProfilePhoto({ profile, onUploaded, className, helpId }: {
  profile: CommuterProfile;
  onUploaded: (profile: CommuterProfile) => void;
  className: string;
  helpId?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy.current) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP photo up to 3 MB.");
      return;
    }
    busy.current = true;
    setUploading(true); setError("");
    try {
      const updated = await uploadProfilePhoto(file);
      if (mounted.current) onUploaded(updated);
    } catch (reason) {
      if (mounted.current) {
        const body = reason instanceof ApiError ? reason.body as { errors?: Record<string, string[]>; message?: string } : null;
        setError(body?.errors?.photo?.[0] ?? body?.message ?? "Couldn't upload your photo. Please try again.");
      }
    } finally {
      busy.current = false;
      if (mounted.current) setUploading(false);
    }
  };

  return <div className="flex shrink-0 flex-col items-center gap-2">
    <button type="button" className={`${className} disabled:opacity-50`} aria-label="Change profile photo" aria-describedby={helpId} disabled={uploading} onClick={() => input.current?.click()}>
      {profile.profileImageUrl && failedUrl !== profile.profileImageUrl ? (
        // Dynamic public R2 URLs are served directly, without an image-proxy allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.profileImageUrl} alt="Your profile photo" className="h-full w-full rounded-2xl object-cover" onError={() => setFailedUrl(profile.profileImageUrl ?? null)} />
      ) : <span aria-label="Profile initials">{profile.firstName[0]}{profile.surname[0]}</span>}
      <span aria-hidden="true" className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#071A2E] bg-[#99C1F1] text-[#071A2E] light:border-white light:bg-[#1A5FB4] light:text-white"><Camera size={15} /></span>
    </button>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" className="sr-only" disabled={uploading} onChange={choose} />
    <span role="status" className="mt-1 text-[11px] font-medium text-[#B6D3F6] light:text-[#1A5FB4]">
      {uploading ? "Uploading…" : "Change photo"}
    </span>
    {error && <p role="alert" className="max-w-28 text-center text-xs text-red-300 light:text-red-600">{error}</p>}
  </div>;
}
