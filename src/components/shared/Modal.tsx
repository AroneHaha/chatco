'use client'

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shared Modal component for Chatco.
 *
 * Supports three visual variants:
 * - "admin"     — bg-[#1A2540] border-[#2A3A55] (dark blue, admin dashboard)
 * - "conductor" — bg-[#0F2135] border-white/[0.08] (dark navy, conductor dashboard)
 * - "default"   — same as "admin" for backward compatibility
 *
 * Features:
 * - Responsive: bottom sheet on mobile, centered dialog on desktop
 * - Backdrop overlay with click-to-close
 * - Close button (X) in top-right corner
 * - Escape key to close
 * - Body scroll lock when open
 * - Optional drag handle indicator on mobile
 */

export type ModalVariant = "admin" | "conductor" | "default"

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Modal content */
  children: React.ReactNode
  /** Visual variant (default: "admin") */
  variant?: ModalVariant
  /** Optional footer content (e.g. action buttons) */
  footer?: React.ReactNode
  /** Additional class names for the modal panel */
  className?: string
  /** Whether clicking the backdrop closes the modal (default: true) */
  closeOnBackdrop?: boolean
  /** Maximum width class (default: "max-w-md") */
  maxWidth?: string
  /** Rounded class (default: "rounded-xl") */
  rounded?: string
}

/** Resolve variant to theme-aware classes */
function getVariantClasses(variant: ModalVariant) {
  switch (variant) {
    case "conductor":
      return {
        panel: "bg-[#0F2135] border-white/[0.08] text-white",
        border: "border-white/[0.08]",
        closeBtn: "text-white/60 hover:text-white hover:bg-white/10",
        footerBorder: "border-white/[0.08]",
        dragHandle: "bg-white/20",
      }
    case "admin":
    case "default":
    default:
      return {
        panel: "bg-[#1A2540] border-[#2A3A55] text-white",
        border: "border-[#2A3A55]",
        closeBtn: "text-slate-400 hover:text-slate-100 hover:bg-white/8",
        footerBorder: "border-[#2A3A55]",
        dragHandle: "bg-white/20",
      }
  }
}

export function Modal({
  isOpen,
  onClose,
  children,
  variant = "admin",
  footer,
  className,
  closeOnBackdrop = true,
  maxWidth = "max-w-md",
  rounded = "rounded-xl",
}: ModalProps) {
  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  const variantClasses = getVariantClasses(variant)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal panel — bottom sheet on mobile, centered on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full shadow-2xl",
          rounded,
          maxWidth,
          "sm:mx-4",
          "max-h-[95vh] sm:max-h-[90vh] flex flex-col",
          // Bottom sheet: remove bottom rounding on mobile
          rounded === "rounded-xl" ? "rounded-b-none sm:rounded-b-xl" : "",
          // Variant-specific styling
          "border",
          variantClasses.panel,
          className
        )}
      >
        {/* Drag handle for mobile bottom sheet */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className={cn("h-1 w-10 rounded-full", variantClasses.dragHandle)} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-3 right-3 p-1.5 rounded-lg transition-colors z-20",
            variantClasses.closeBtn
          )}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              "px-6 pb-6 pt-2 flex items-center justify-end gap-3 border-t",
              variantClasses.footerBorder
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
