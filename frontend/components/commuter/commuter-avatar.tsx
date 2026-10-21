"use client";

import { UserAvatar } from "@/components/admin/ui/user-avatar";

/**
 * The commuter's own avatar in the app shell (dashboard header, sidebar,
 * dock). With no uploaded photo it shows the default person image on CHATCO
 * Blue; once a photo is uploaded, the R2 copy covers it (resized and cached
 * via UserAvatar).
 */
export function CommuterAvatar({
  src,
  className,
  iconClassName,
  sizes,
}: {
  /** Public R2 URL of the photo; null/undefined shows the default image. */
  src: string | null | undefined;
  /** Size (and any extra) classes, e.g. `w-9 h-9`. */
  className: string;
  /** Size classes for the default person image, e.g. `w-[18px] h-[18px]`. */
  iconClassName: string;
  /** Rendered width for next/image's srcset, e.g. `36px`. */
  sizes: string;
}) {
  return (
    <UserAvatar
      src={src}
      // The commuter's name is always shown beside it, so the image is decorative.
      alt=""
      className={className}
      iconClassName={iconClassName}
      sizes={sizes}
      surfaceClassName="rounded-full bg-[#1A5FB4] text-white border-2 border-white/20 light:border-[#DAEEFF]"
    />
  );
}
