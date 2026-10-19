import type { Metadata } from "next";
import Footer from "@/components/landing/Footer";
import SetNewPasswordForm from "@/components/auth/set-new-password-form";
import SetPasswordHeader from "@/components/auth/set-password-header";
import styles from "@/components/auth/login.module.css";

export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
};

/**
 * A page, not a dialog, so it survives refreshes and direct visits. The landing
 * page's bar and compact footer frame the sign-in modal's dark panel, so a
 * commuter arriving from sign-in stays on the CHATCO site.
 */
export default function SetNewPasswordPage() {
  return (
    <div className={`${styles.shell} flex flex-col font-sans`}>
      <SetPasswordHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section
          className={`${styles.modal} ${styles.darkModal}`}
          aria-labelledby="set-password-heading"
          aria-describedby="set-password-description"
        >
          <div className="pt-4 lg:pt-6">
            <div className={styles.modalForm}>
              <SetNewPasswordForm />
            </div>
          </div>
        </section>
      </main>

      <Footer compact />
    </div>
  );
}
