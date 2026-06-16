'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Shared MetricCard component for Chatco.
 *
 * A stat card displaying an icon, value, label, and optional trend indicator.
 * Used across admin dashboard and conductor views.
 *
 * - `icon`: Lucide icon component
 * - `iconColor` & `iconBg`: optional, with sensible defaults (blue)
 * - `trend`: optional trend indicator ("up" | "down" | "neutral") with value text
 * - Theme-aware: dark / light
 */

export type TrendDirection = "up" | "down" | "neutral"

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label text (e.g. "Active Users") */
  label: string
  /** Primary value to display (e.g. "1,234") */
  value: string | number
  /** Icon component (Lucide icon) */
  icon: React.ElementType
  /** Icon color class (default: "text-blue-400") */
  iconColor?: string
  /** Icon background class (default: "bg-blue-400/10") */
  iconBg?: string
  /** Trend direction and value (e.g. { direction: "up", value: "+12%" }) */
  trend?: {
    direction: TrendDirection
    value: string
  }
  /** Visual theme (default: "dark") */
  theme?: "dark" | "light"
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-blue-400",
  iconBg = "bg-blue-400/10",
  trend,
  theme = "dark",
  className,
  ...props
}: MetricCardProps) {
  const isDark = theme === "dark"

  const trendColorClass = trend
    ? trend.direction === "up"
      ? "text-emerald-400"
      : trend.direction === "down"
        ? "text-red-400"
        : isDark
          ? "text-white/50"
          : "text-gray-400"
    : undefined

  return (
    <div
      className={cn(
        "rounded-xl p-4 sm:p-5 border transition-shadow duration-200",
        isDark
          ? "bg-[#1A2540] border-[#2A3A55] shadow-lg shadow-black/10"
          : "bg-white border-gray-200 shadow-sm",
        "hover:shadow-xl",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Text content */}
        <div className="flex flex-col gap-1 min-w-0">
          <span
            className={cn(
              "text-xs font-medium uppercase tracking-wider",
              isDark ? "text-white/50" : "text-gray-400"
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              "text-2xl font-bold leading-tight",
              isDark ? "text-white" : "text-gray-900"
            )}
          >
            {value}
          </span>
          {trend && (
            <span className={cn("text-xs font-medium", trendColorClass)}>
              {trend.direction === "up" && "↑ "}
              {trend.direction === "down" && "↓ "}
              {trend.value}
            </span>
          )}
        </div>

        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center rounded-lg h-10 w-10 shrink-0",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  )
}
