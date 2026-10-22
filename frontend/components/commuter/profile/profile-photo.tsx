"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { uploadProfilePhoto } from "@/lib/commuter/services/profile.service";
import type { CommuterProfile } from "@/types";
import { UserAvatar } from "@/components/admin/ui/user-avatar";
import ProfilePhotoCropper from "./profile-photo-cropper";

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
  // The chosen photo waiting in the crop step; only the cropped square is uploaded.
  // Its object URL is created when chosen and revoked when the step closes.
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const pendingUrl = useRef<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pendingUrl.current) URL.revokeObjectURL(pendingUrl.current);
    };
  }, []);

  const closeCrop = () => {
    if (pendingUrl.current) URL.revokeObjectURL(pendingUrl.current);
    pendingUrl.current = null;
    setPending(null);
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy.current) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP photo up to 3 MB.");
      return;
    }
    setError("");
    if (pendingUrl.current) URL.revokeObjectURL(pendingUrl.current);
    const url = URL.createObjectURL(file);
    pendingUrl.current = url;
    setPending({ file, url });
  };

  const upload = async (file: File) => {
    closeCrop();
    if (busy.current) return;
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
      {/* The default person image shows until a photo is uploaded; the R2
          photo then covers it, served as a resized, cached copy rather than
          the full upload. */}
      <UserAvatar
        src={profile.profileImageUrl}
        alt="Your profile photo"
        className="h-full w-full"
        iconClassName="h-10 w-10 sm:h-12 sm:w-12"
        sizes="(min-width: 640px) 96px, 80px"
        surfaceClassName="rounded-2xl"
      />
      <span aria-hidden="true" className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#071A2E] bg-[#99C1F1] text-[#071A2E] light:border-white light:bg-[#1A5FB4] light:text-white"><Camera size={15} /></span>
    </button>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" className="sr-only" disabled={uploading} onChange={choose} />
    <span role="status" className="mt-1 text-[11px] font-medium text-[#B6D3F6] light:text-[#1A5FB4]">
      {uploading ? "Uploading…" : "Change photo"}
    </span>
    {error && <p role="alert" className="max-w-28 text-center text-xs text-red-300 light:text-red-600">{error}</p>}
    {pending && <ProfilePhotoCropper src={pending.url} fileName={pending.file.name} onCancel={closeCrop} onConfirm={(cropped) => { void upload(cropped); }} />}
  </div>;
}
