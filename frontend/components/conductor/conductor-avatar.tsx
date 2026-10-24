"use client";

import { UserAvatar } from "@/components/admin/ui/user-avatar";

/**
 * The conductor's own avatar in the app shell (dashboard card/bar, sidebar,
 * dock), matching CommuterAvatar: with no photo it shows the default person
 * image on CHATCO Blue; once admin uploads one, the R2 copy covers it.
 * `isOnBreak` keeps the dashboard's break colour, with a solid sky ring so the
 * state still shows when a photo covers the fill.
 */
export function ConductorAvatar({
  src,
  isOnBreak = false,
  className,
  iconClassName,
  sizes,
}: {
  /** Public R2 URL of the photo; null/undefined shows the default image. */
  src: string | null | undefined;
  isOnBreak?: boolean;
  /** Size (and any extra) classes, e.g. `w-10 h-10 shadow-lg`. */
  className: string;
  /** Size classes for the default person image, e.g. `w-5 h-5`. */
  iconClassName: string;
  /** Rendered width for next/image's srcset, e.g. `40px`. */
  sizes: string;
}) {
  return (
    <UserAvatar
      src={src}
      // The conductor's name is always shown beside it, so the image is decorative.
      alt=""
      className={className}
      iconClassName={iconClassName}
      sizes={sizes}
      surfaceClassName={`rounded-full border-2 text-white transition-colors duration-300 ${
        isOnBreak ? "border-sky-300 bg-sky-500 shadow-sky-500/30" : "border-white/20 bg-[#1A5FB4] light:border-[#DAEEFF]"
      }`}
    />
  );
}
