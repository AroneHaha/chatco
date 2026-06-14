// components/admin/ui/sign-out-modal.tsx
'use client';

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LogOut } from 'lucide-react';

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SignOutModal({ isOpen, onClose, onConfirm }: SignOutModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      icon={LogOut}
      title="Sign Out"
      description="Are you sure you want to sign out of your admin account? You will need to log in again to access the dashboard."
      confirmLabel="Yes, Sign Out"
      cancelLabel="Cancel"
      confirmVariant="danger"
      modalVariant="admin"
    />
  );
}
