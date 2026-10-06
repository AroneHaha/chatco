"use client";

import { useState } from "react";
import AuthModal from "./auth-modal";
import LoginForm from "./login-form";
import styles from "./login.module.css";

export default function LoginModal({ standalone = false }: { standalone?: boolean }) {
  const [busy, setBusy] = useState(false);

  return (
    <AuthModal
      className={styles.darkModal}
      busy={busy}
      headingId="sign-in-heading"
      descriptionId="login-description"
      closeLabel="Close sign in"
      focusSelector='input[autocomplete="username"]'
      standalone={standalone}
    >
      <LoginForm onBusyChange={setBusy} />
    </AuthModal>
  );
}
