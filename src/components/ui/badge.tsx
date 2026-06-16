'use client'

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Shared Badge component for Chatco.
 *
 * Extends the standard shadcn/ui badge with Chatco-specific variants:
 * - success  — green, for positive states
 * - warning  — amber, for caution states
 * - danger   — red, for error / critical states
 * - info     — sky/blue, for informational states
 * - neutral  — gray, for default / muted states
 *
 * Also accepts a `status` prop for conductor capacity states:
 * - available  → green badge ("Available")
 * - standing   → amber badge ("Standing")
 * - full       → red badge ("Full")
 *
 * The original shadcn variants (default, secondary, destructive, outline)
 * are preserved for backward compatibility.
 */

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        success:
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 [a&]:hover:bg-emerald-500/25",
        warning:
          "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400 [a&]:hover:bg-amber-500/25",
        danger:
          "border-transparent bg-red-500/15 text-red-700 dark:text-red-400 [a&]:hover:bg-red-500/25",
        info:
          "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-400 [a&]:hover:bg-sky-500/25",
        neutral:
          "border-transparent bg-gray-500/15 text-gray-600 dark:text-gray-400 [a&]:hover:bg-gray-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Conductor vehicle capacity status type.
 */
export type CapacityStatus = "available" | "standing" | "full"

/** Map capacity status → badge variant + display label */
const CAPACITY_STATUS_MAP: Record<
  CapacityStatus,
  { variant: "success" | "warning" | "danger"; label: string }
> = {
  available: { variant: "success", label: "Available" },
  standing: { variant: "warning", label: "Standing" },
  full: { variant: "danger", label: "Full" },
}

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
  /**
   * Conductor capacity status. When provided, automatically sets variant
   * and renders the corresponding label text ("Available"/"Standing"/"Full").
   * Overrides `variant` and `children` when set.
   */
  status?: CapacityStatus
}

function Badge({
  className,
  variant,
  asChild = false,
  status,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span"

  // If status is provided, derive variant and label from it
  if (status) {
    const { variant: statusVariant, label } = CAPACITY_STATUS_MAP[status]
    return (
      <Comp
        data-slot="badge"
        className={cn(badgeVariants({ variant: statusVariant }), className)}
        {...props}
      >
        {label}
      </Comp>
    )
  }

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
