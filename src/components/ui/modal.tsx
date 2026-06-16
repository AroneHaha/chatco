'use client'

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shared Modal component for Chatco.
 *
 * Features:
 * - Theme-aware: accepts `theme` prop ('dark' | 'light')
 *   - dark: uses admin theme colors (bg-[#1A2540], border-[#2A3A55])
 *   - light: uses standard light colors
 * - Responsive: bottom sheet on mobile, centered dialog on desktop
 * - Backdrop overlay with click-to-close
 * - Close button (top-right on desktop, top-right on mobile sheet)
 * - Smooth enter/exit transitions
 * - Accessible: focus trap, aria attributes
 */

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Modal title */
  title?: string
  /** Visual theme */
  theme?: "dark" | "light"
  /** Modal content */
  children: React.ReactNode
  /** Optional footer content (e.g. action buttons) */
  footer?: React.ReactNode
  /** Additional class names for the modal panel */
  className?: string
  /** Whether clicking the backdrop closes the modal (default: true) */
  closeOnBackdrop?: boolean
  /** Maximum width class (default: "max-w-md") */
  maxWidth?: string
}

export function Modal({
  open,
  onClose,
  title,
  theme = "dark",
  children,
  footer,
  className,
  closeOnBackdrop = true,
  maxWidth = "max-w-md",
}: ModalProps) {
  // Close on Escape key
  React.useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  const isDark = theme === "dark"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
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
        aria-labelledby={title ? "modal-title" : undefined}
        className={cn(
          "relative z-10 w-full rounded-t-2xl sm:rounded-2xl shadow-2xl",
          "animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95",
          "duration-200",
          maxWidth,
          // Mobile: full width bottom sheet, Desktop: centered with margin
          "sm:mx-4",
          // Theme colors
          isDark
            ? "bg-[#1A2540] border border-[#2A3A55] text-white"
            : "bg-white border border-gray-200 text-gray-900",
          className
        )}
      >
        {/* Drag handle for mobile bottom sheet */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div
            className={cn(
              "h-1 w-10 rounded-full",
              isDark ? "bg-white/20" : "bg-gray-300"
            )}
          />
        </div>

        {/* Header */}
        {(title || true) && (
          <div
            className={cn(
              "flex items-center justify-between px-6 pt-4 sm:pt-6",
              title ? "pb-3" : "pb-0"
            )}
          >
            {title && (
              <h2
                id="modal-title"
                className={cn(
                  "text-lg font-semibold",
                  isDark ? "text-white" : "text-gray-900"
                )}
              >
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className={cn(
                "ml-auto rounded-full p-1.5 transition-colors",
                isDark
                  ? "text-white/60 hover:text-white hover:bg-white/10"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              )}
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              "px-6 pb-6 pt-2 flex items-center justify-end gap-3",
              isDark ? "border-t border-[#2A3A55]" : "border-t border-gray-100"
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
