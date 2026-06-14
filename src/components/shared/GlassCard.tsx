'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Shared GlassCard component for Chatco.
 *
 * A frosted-glass card with backdrop blur, semi-transparent background,
 * and subtle border. Used across admin and conductor dashboards.
 *
 * Theme-aware:
 * - dark (default): dark glass with blue-tinted border
 * - light: light glass with neutral border
 */

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual theme (default: "dark") */
  theme?: "dark" | "light"
  /** Card content */
  children: React.ReactNode
  /** Whether to add padding (default: true) */
  padded?: boolean
}

export function GlassCard({
  theme = "dark",
  children,
  padded = true,
  className,
  ...props
}: GlassCardProps) {
  const isDark = theme === "dark"

  return (
    <div
      className={cn(
        "rounded-xl backdrop-blur-md border transition-shadow duration-200",
        isDark
          ? "bg-white/5 border-[#2A3A55] shadow-lg shadow-black/10"
          : "bg-white/60 border-gray-200/60 shadow-md shadow-black/5",
        padded && "p-4 sm:p-6",
        "hover:shadow-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
