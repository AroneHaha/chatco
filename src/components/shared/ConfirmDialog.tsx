'use client'

import * as React from "react"
import { Modal, type ModalVariant } from "./Modal"

/**
 * Shared ConfirmDialog component for Chatco.
 *
 * A generic confirmation dialog with:
 * - Icon at top (configurable)
 * - Title + description
 * - Cancel + Confirm buttons
 * - Configurable confirm button variant ("danger" | "primary")
 * - Theme-aware via Modal variant
 *
 * Used by admin (sign-out-modal) and conductor (clear-cache-modal, remittance ConfirmModal).
 */

export type ConfirmVariant = "danger" | "primary"

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog should close (also fires on cancel) */
  onClose: () => void
  /** Callback when user confirms the action */
  onConfirm: () => void
  /** Icon component to display at the top (e.g. LogOut, Trash2, AlertTriangle) */
  icon: React.ElementType
  /** Color class for the icon (default: varies by confirmVariant) */
  iconColor?: string
  /** Background class for the icon container (default: varies by confirmVariant) */
  iconBg?: string
  /** Dialog title */
  title: string
  /** Dialog description */
  description: string
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string
  /** Visual variant of the confirm button (default: "danger") */
  confirmVariant?: ConfirmVariant
  /** Modal variant for theming (default: "admin") */
  modalVariant?: ModalVariant
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  modalVariant = "admin",
}: ConfirmDialogProps) {
  // Default icon styling based on confirm variant
  const resolvedIconColor = iconColor ?? (confirmVariant === "danger" ? "text-red-400" : "text-blue-400")
  const resolvedIconBg = iconBg ?? (confirmVariant === "danger" ? "bg-red-500/10" : "bg-blue-500/10")

  // Button styling based on confirm variant
  const confirmButtonClass =
    confirmVariant === "danger"
      ? "flex-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
      : "flex-1 px-4 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"

  return (
    <Modal isOpen={isOpen} onClose={onClose} variant={modalVariant}>
      <div className="text-center space-y-4">
        {/* Icon */}
        <div className={`mx-auto w-16 h-16 rounded-full ${resolvedIconBg} flex items-center justify-center`}>
          <Icon className={resolvedIconColor} size={32} />
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-sm text-gray-400 mt-2">{description}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={confirmButtonClass}
          >
            {confirmVariant === "danger" && <Icon size={18} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
