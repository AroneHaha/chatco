"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./auth-modal";
import ForgotPasswordForm from "./forgot-password-form";
import styles from "./login.module.css";

export default function ForgotPasswordModal({ standalone = false }: { standalone?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const returnToLogin = useCallback(() => {
    if (standalone) router.replace("/login");
    else router.back();
  }, [router, standalone]);

  return (
    <AuthModal className={styles.darkModal} busy={busy} headingId="reset-heading" descriptionId="reset-description" closeLabel="Close password recovery" focusSelector="#reset-email" standalone={standalone}>
      <ForgotPasswordForm onBusyChange={setBusy} onReturnToLogin={returnToLogin} />
    </AuthModal>
  );
}
