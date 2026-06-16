'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Shared StatusBadge component for Chatco conductor side.
 *
 * Displays a vehicle capacity status badge with a pulsing dot indicator.
 * Extracted from the inline pattern in conductor-dashboard.tsx.
 *
 * Capacity states:
 * - available → green dot + "Available" label
 * - standing  → amber dot + "Standing" label
 * - full      → red dot + "Full" label
 *
 * Also supports a custom `label` override and size variants.
 */

export type CapacityStatus = "available" | "standing" | "full"

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Vehicle capacity status */
  status: CapacityStatus
  /** Override the default label text */
  label?: string
  /** Size variant (default: "default") */
  size?: "sm" | "default" | "lg"
  /** Whether to show a pulsing animation on the dot (default: true when status is "available") */
  pulse?: boolean
}

const STATUS_CONFIG: Record<
  CapacityStatus,
  { dotColor: string; bgColor: string; textColor: string; defaultLabel: string }
> = {
  available: {
    dotColor: "bg-emerald-400",
    bgColor: "bg-emerald-400/10",
    textColor: "text-emerald-400",
    defaultLabel: "Available",
  },
  standing: {
    dotColor: "bg-amber-400",
    bgColor: "bg-amber-400/10",
    textColor: "text-amber-400",
    defaultLabel: "Standing",
  },
  full: {
    dotColor: "bg-red-400",
    bgColor: "bg-red-400/10",
    textColor: "text-red-400",
    defaultLabel: "Full",
  },
}

const SIZE_MAP = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  default: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3 py-1.5 text-sm gap-2",
} as const

const DOT_SIZE_MAP = {
  sm: "h-1.5 w-1.5",
  default: "h-2 w-2",
  lg: "h-2.5 w-2.5",
} as const

export function StatusBadge({
  status,
  label,
  size = "default",
  pulse,
  className,
  ...props
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const displayLabel = label ?? config.defaultLabel
  const shouldPulse = pulse ?? status === "available"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        config.bgColor,
        config.textColor,
        SIZE_MAP[size],
        className
      )}
      {...props}
    >
      {/* Status dot */}
      <span className="relative flex shrink-0">
        <span
          className={cn("rounded-full", config.dotColor, DOT_SIZE_MAP[size])}
        />
        {shouldPulse && (
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-75",
              config.dotColor
            )}
          />
        )}
      </span>
      {displayLabel}
    </span>
  )
}
