"use client";

import styles from "./signup.module.css";
import SignupForm from "@/components/auth/signup-form";

export default function SignupContent({ onBusyChange, initialMaintenanceMessage }: {
  onBusyChange: (busy: boolean) => void;
  initialMaintenanceMessage: string | null;
}) {
  return (
    <div className={styles.formPane}>
      <SignupForm onBusyChange={onBusyChange} initialMaintenanceMessage={initialMaintenanceMessage} />
    </div>
  );
}
