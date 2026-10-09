"use client";

import styles from "./signup.module.css";
import SignupForm from "@/components/auth/signup-form";

export default function SignupContent({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
  return (
    <div className={styles.formPane}>
      <SignupForm onBusyChange={onBusyChange} />
    </div>
  );
}
