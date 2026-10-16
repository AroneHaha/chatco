"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ApiError } from "@/lib/api/client";
import { uploadProfilePhoto } from "@/lib/commuter/services/profile.service";
import type { CommuterProfile } from "@/types";

export default function ProfilePhoto({ profile, onUploaded, className }: {
  profile: CommuterProfile;
  onUploaded: (profile: CommuterProfile) => void;
  className: string;
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
    <div className={`${className} overflow-hidden`}>
      {profile.profileImageUrl && failedUrl !== profile.profileImageUrl ? (
        // Dynamic public R2 URLs are served directly, without an image-proxy allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.profileImageUrl} alt="Your profile photo" className="h-full w-full object-cover" onError={() => setFailedUrl(profile.profileImageUrl ?? null)} />
      ) : <span aria-label="Profile initials">{profile.firstName[0]}{profile.surname[0]}</span>}
    </div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" className="sr-only" disabled={uploading} onChange={choose} />
    <button type="button" className="min-h-10 rounded-lg px-2 text-xs font-medium text-[#99C1F1] disabled:opacity-50" disabled={uploading} onClick={() => input.current?.click()}>
      {uploading ? "Uploading…" : "Change photo"}
    </button>
    {error && <p role="alert" className="max-w-28 text-center text-xs text-red-300">{error}</p>}
  </div>;
}
