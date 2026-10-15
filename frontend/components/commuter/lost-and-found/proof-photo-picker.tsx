"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

// Same limits as the backend ClaimLostItemRequest (and admin item photos).
const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ProofPhotoPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  /** "admin" re-skins it for the admin desk (walk-in claimant form). */
  variant?: "commuter" | "admin";
  /** Replaces the default hint shown under the tiles. */
  helperText?: string;
}

const SKINS = {
  commuter: {
    label: "mb-2 block text-sm font-semibold text-white/75",
    optional: "font-medium text-white/45",
    tile: "border-white/10 bg-[#0E1628]",
    empty: "border-white/15 bg-white/[0.03] text-white/45 hover:border-[#62A0EA] hover:text-[#62A0EA]",
    helper: "mt-2 text-[11px] font-medium text-white/55",
  },
  admin: {
    label: "mb-1.5 block text-xs font-semibold text-slate-300",
    optional: "font-medium text-slate-500",
    tile: "border-[#1E2D45] bg-[#0B1120]",
    empty: "border-[#1E2D45] bg-[#0B1120] text-slate-500 hover:border-[#62A0EA]/60 hover:text-[#8CB9F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]",
    helper: "mt-2 text-xs text-slate-500",
  },
} as const;

export default function ProofPhotoPicker({ files, onChange, disabled = false, variant = "commuter", helperText }: ProofPhotoPickerProps) {
  const skin = SKINS[variant];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    const valid = selected.filter((file) => ACCEPTED_TYPES.includes(file.type) && file.size <= MAX_BYTES);
    const room = MAX_PHOTOS - files.length;
    const added = valid.slice(0, room);

    if (valid.length < selected.length) {
      setError("Photos must be JPG, PNG, or WEBP and 5 MB or smaller.");
    } else if (valid.length > room) {
      setError(`You can attach up to ${MAX_PHOTOS} photos.`);
    } else {
      setError(null);
    }

    if (added.length > 0) onChange([...files, ...added]);
  };

  const removeAt = (index: number) => {
    setError(null);
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className={skin.label}>
        Photos <span className={skin.optional}>(optional)</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: MAX_PHOTOS }, (_, index) => {
          const preview = previews[index];
          if (preview) {
            return (
              <div key={preview} className={`relative aspect-square overflow-hidden rounded-lg border ${skin.tile}`}>
                <img src={preview} alt={`Proof photo ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  disabled={disabled}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-black/60 text-white/80 transition-colors hover:bg-black/80 hover:text-white disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }
          return (
            <button
              key={`empty-${index}`}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${skin.empty}`}
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Add photo</span>
            </button>
          );
        })}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />
      {error ? (
        <p className="mt-2 text-[11px] font-medium text-red-300">{error}</p>
      ) : (
        <p className={skin.helper}>
          {helperText ?? `Up to ${MAX_PHOTOS} photos, such as a receipt or a picture of you with the item. JPG, PNG, or WEBP, 5 MB each.`}
        </p>
      )}
    </div>
  );
}
