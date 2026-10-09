"use client";

import { useState } from "react";
import AuthModal from "./auth-modal";
import SignupContent from "./signup-content";
import authStyles from "./login.module.css";
import styles from "./signup.module.css";

export default function SignupModal({ standalone = false }: { standalone?: boolean }) {
  const [busy, setBusy] = useState(false);

  return (
    <AuthModal
      className={`${authStyles.darkModal} ${styles.modal}`}
      headerClassName={styles.modalHeader}
      contentClassName={styles.modalBody}
      busy={busy}
      headingId="signup-heading"
      descriptionId="signup-description"
      closeLabel="Close signup"
      focusSelector="#firstName"
      standalone={standalone}
      dismissHref="/"
    >
      <SignupContent onBusyChange={setBusy} />
    </AuthModal>
  );
}
