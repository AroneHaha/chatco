'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { UserRound } from 'lucide-react';

const R2_PROFILES_PREFIX = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/+$/, '')}/profiles/`
  : null;

/** The admin shell's avatar surface — the default when no surfaceClassName is given. */
const ADMIN_SURFACE =
  'rounded-full border border-[#2A3A55] bg-[#1A2540] text-white/45 admin-light:border-[#D7E0EB] admin-light:bg-[#F1F5F9] admin-light:text-slate-400';

interface UserAvatarProps {
  /** Public R2 URL of the profile photo; empty or null shows the fallback. */
  src?: string | null;
  alt: string;
  /** Size classes for the circle, e.g. `h-14 w-14`. */
  className?: string;
  /** Size classes for the fallback icon, e.g. `h-6 w-6`. */
  iconClassName?: string;
  /** Rendered width for next/image's srcset, e.g. `36px` or `(min-width: 640px) 88px, 56px`. */
  sizes?: string;
  /** Shape, colour and border classes; defaults to the admin surface. */
  surfaceClassName?: string;
  /** Shown when there is no photo (or it fails); defaults to a person icon. */
  fallback?: ReactNode;
}

/**
 * Same fallback as the dashboard's Users preview: the fallback sits underneath
 * and the photo covers it, hiding itself if the R2 object can't be loaded.
 *
 * Photos from our R2 /profiles/ prefix go through next/image (allowed in
 * next.config.ts), so a small avatar downloads a resized, cached copy and
 * lazy-loads off-screen. Every upload gets a new object key, so a cached copy
 * never goes stale. Anything else falls back to a plain lazy <img>.
 */
export function UserAvatar({
  src,
  alt,
  className = 'h-10 w-10',
  iconClassName = 'h-[18px] w-[18px]',
  sizes = '40px',
  surfaceClassName = ADMIN_SURFACE,
  fallback,
}: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(src) && failedSrc !== src;
  const optimizable = Boolean(src && R2_PROFILES_PREFIX && src.startsWith(R2_PROFILES_PREFIX));

  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden ${surfaceClassName} ${className}`}>
      {fallback ?? <UserRound className={iconClassName} aria-hidden="true" />}
      {showPhoto && src && (optimizable ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" onError={() => setFailedSrc(src)} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailedSrc(src)} />
      ))}
    </span>
  );
}
