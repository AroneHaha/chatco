// components/admin/layout/sticky-page-header.tsx
'use client';

import { ReactNode } from 'react';

/**
 * Pins a page's title row to the top of the admin scroll area on phones.
 *
 * The admin shell renders a mobile branch below 768px where `<main>` is the
 * scroll container (`flex-1 p-4 pb-24 overflow-y-auto`). Page titles lived in
 * that scroll flow, so they slid away as soon as you moved down a long table
 * and you lost track of which screen you were on. Above 768px the shell
 * switches to the desktop branch with a sidebar and far more vertical room, so
 * everything here reverts to plain static layout at `md`.
 *
 * `-mx-4 px-4` cancels `<main>`'s horizontal padding so the bar and its bottom
 * border span the full width instead of floating inside the content column.
 * `-mt-4 pt-4` does the same vertically for the bar's RESTING position, and
 * `-top-4` for its PINNED one. Both are needed, and the second is the
 * non-obvious half: a browser resolves a sticky `top` against the scroll
 * container's CONTENT box, so `top-0` parks the bar 16px down — `<main>`'s
 * padding-top — leaving a transparent band that scrolling rows show through.
 * That band was measured at exactly 16px on all four admin pages before
 * `-top-4` was added; it's what made the header look detached from the edge.
 *
 * Because of that negative top margin the bar MUST be the first child of the
 * page — anything rendered above it loses 16px underneath. Monitoring's SOS
 * banner is ordered after the header for exactly this reason.
 *
 * The background is fully opaque rather than the translucent + blurred
 * treatment used elsewhere: rows passing under a 95%-alpha bar stayed faintly
 * legible, which read as content leaking above the header instead of a clean
 * edge.
 *
 * The notification bell is mounted `fixed top-3 right-3 z-50`, above this
 * bar's `z-30`, so it keeps floating over the right end rather than being
 * covered — which reads as a header bar with a bell in it. `pr-16` reserves
 * the bell's width (40px + gutters) so a long title wraps before it collides
 * instead of sliding underneath.
 *
 * This depends on the mobile shell pinning its height (`h-dvh` +
 * `overflow-hidden` on the root, `min-h-0` on `<main>`) so `<main>` is the
 * element that actually scrolls. Without that, `sticky` has no scrollport to
 * stick to and the bar scrolls away with the content.
 */
export function StickyPageHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sticky -top-4 z-30 -mx-4 -mt-4 px-4 pr-16 pt-4 pb-3 bg-[#0B1120] border-b border-white/5 md:static md:top-0 md:mx-0 md:mt-0 md:px-0 md:pt-0 md:pb-0 md:bg-transparent md:border-0 ${className}`}
    >
      {children}
    </div>
  );
}
