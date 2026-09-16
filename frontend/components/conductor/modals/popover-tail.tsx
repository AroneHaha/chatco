"use client";

/**
 * xl:+ only — the small diamond that makes a conductor popover modal read as
 * anchored to its trigger button in ConductorDock rather than a detached
 * floating card. Rendered as its own `fixed` sibling (not a child of the
 * modal's panel) so it's never clipped by a panel's own
 * `overflow-hidden`/`overflow-y-auto`.
 *
 * Every popover modal bottom-anchors its panel via `xl:pb-24` (96px) — see
 * usePopoverModal's consumers — so the panel's bottom edge is always at a
 * fixed 96px from the viewport bottom regardless of the panel's own height.
 * `bottom-[90px]` centers this 12px diamond on that seam: half tucked behind
 * the panel's bottom edge (invisible, since the fill color matches), half
 * poking out toward the dock below.
 *
 * `anchorOffsetPx` (from usePopoverModal) shifts it off dead-center to sit
 * under the real trigger button — the dock isn't symmetric around any one
 * button, so viewport-center would visibly point at the wrong one.
 */
export function PopoverTail({ panelColor, anchorOffsetPx }: { panelColor: string; anchorOffsetPx: number | null }) {
  return (
    <div
      aria-hidden="true"
      className="hidden xl:block fixed bottom-[90px] -translate-x-1/2 z-[101] h-3 w-3 rotate-45 border-b border-r border-white/10"
      style={{ backgroundColor: panelColor, left: `calc(50% + ${anchorOffsetPx ?? 0}px)` }}
    />
  );
}
