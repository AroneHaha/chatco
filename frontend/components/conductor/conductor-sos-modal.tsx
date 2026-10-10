"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import SosConfirmModal from "@/components/conductor/modals/sos-confirm-modal";

export default function ConductorSosModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);

  useEffect(() => {
    window.addEventListener("conductor:open-sos", open);
    return () => window.removeEventListener("conductor:open-sos", open);
  }, [open]);

  // Mount after authentication so the modal restores this user's saved SOS.
  if (user?.role !== "CONDUCTOR") return null;

  return (
    <SosConfirmModal
      key={user.id}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onResolved={open}
    />
  );
}
