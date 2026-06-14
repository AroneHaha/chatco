// components/admin/ui/modal.tsx
// Re-exports the shared Modal with admin theme as the default.
// Existing consumers that use `import { Modal } from '@/components/admin/ui/modal'`
// will continue to work without changes.

import { Modal as SharedModal, type ModalProps as SharedModalProps, type ModalVariant } from '@/components/shared/Modal';
import { ReactNode } from 'react';

/**
 * Admin-specific Modal props.
 * Wraps the shared Modal with `variant="admin"` as the default.
 */
interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  rounded?: string;
  variant?: ModalVariant;
  className?: string;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
}

export function Modal({
  variant = "admin",
  ...props
}: AdminModalProps) {
  return <SharedModal variant={variant} {...props} />;
}

export type { ModalVariant };
