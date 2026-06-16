'use client'

import * as React from "react"
import { Wallet, Banknote, Smartphone, Ticket } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shared PaymentSummaryCard component for Chatco conductor side.
 *
 * Displays a payment breakdown card with Total / GCash / Cash / Voucher rows.
 * Extracted from the inline pattern in conductor-dashboard.tsx.
 *
 * - Accepts individual payment amounts as props
 * - Computes the total automatically if not provided
 * - Theme-aware: dark / light
 * - Each payment method has a distinct icon and color
 */

export interface PaymentSummaryCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Total amount (overrides computed sum if provided) */
  total?: number
  /** GCash amount */
  gcash: number
  /** Cash amount */
  cash: number
  /** Voucher amount */
  voucher: number
  /** Visual theme (default: "dark") */
  theme?: "dark" | "light"
  /** Currency symbol (default: "₱") */
  currency?: string
}

interface PaymentRow {
  label: string
  amount: number
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

function formatCurrency(value: number, currency: string): string {
  return `${currency}${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function PaymentSummaryCard({
  total: totalProp,
  gcash,
  cash,
  voucher,
  theme = "dark",
  currency = "₱",
  className,
  ...props
}: PaymentSummaryCardProps) {
  const isDark = theme === "dark"
  const computedTotal = totalProp ?? gcash + cash + voucher

  const rows: PaymentRow[] = [
    {
      label: "GCash",
      amount: gcash,
      icon: Smartphone,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-400/10",
    },
    {
      label: "Cash",
      amount: cash,
      icon: Banknote,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-400/10",
    },
    {
      label: "Voucher",
      amount: voucher,
      icon: Ticket,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-400/10",
    },
  ]

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        isDark
          ? "bg-[#0F2135] border-white/10"
          : "bg-white border-gray-200 shadow-sm",
        className
      )}
      {...props}
    >
      {/* Total header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 sm:px-5",
          isDark
            ? "bg-[#1A2540] border-b border-[#2A3A55]"
            : "bg-gray-50 border-b border-gray-100"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center justify-center rounded-lg h-8 w-8",
              isDark ? "bg-white/10" : "bg-gray-200"
            )}
          >
            <Wallet
              className={cn(
                "h-4 w-4",
                isDark ? "text-white/70" : "text-gray-600"
              )}
            />
          </div>
          <span
            className={cn(
              "text-sm font-medium",
              isDark ? "text-white/70" : "text-gray-500"
            )}
          >
            Total
          </span>
        </div>
        <span
          className={cn(
            "text-lg font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}
        >
          {formatCurrency(computedTotal, currency)}
        </span>
      </div>

      {/* Payment breakdown rows */}
      <div className="divide-y divide-transparent">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-2.5 sm:px-5"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex items-center justify-center rounded-lg h-7 w-7",
                  row.iconBg
                )}
              >
                <row.icon className={cn("h-3.5 w-3.5", row.iconColor)} />
              </div>
              <span
                className={cn(
                  "text-sm",
                  isDark ? "text-white/60" : "text-gray-600"
                )}
              >
                {row.label}
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-semibold",
                isDark ? "text-white" : "text-gray-900"
              )}
            >
              {formatCurrency(row.amount, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
