"use client";

import { useState } from "react";
import AuthModal from "./auth-modal";
import styles from "./signup.module.css";
import { POLICY_EFFECTIVE_DATE, POLICY_VERSION, REGISTRATION_TERMS } from "@/lib/legal/registration-policies";
import type { RegistrationAgreement } from "@/lib/auth/register";

export default function RegistrationTermsModal({ busy, error, onBack, onConfirm }: {
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: (agreement: RegistrationAgreement) => void;
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const agreed = termsAccepted && privacyAcknowledged && detailsConfirmed;

  return (
    <AuthModal
      busy={busy}
      headingId="registration-terms-heading"
      descriptionId="registration-terms-description"
      closeLabel="Close terms and return to registration"
      focusSelector="#registration-terms-heading"
      onDismiss={onBack}
      className={`${styles.modal} ${styles.termsModal}`}
      headerClassName={styles.modalHeader}
      contentClassName={styles.termsContent}
    >
      <h2 id="registration-terms-heading" tabIndex={-1} className={styles.title}>CHATCO Terms and Conditions</h2>
      <p id="registration-terms-description" className={styles.subtitle}>
        Please review these terms before submitting your commuter registration. They explain your responsibilities and how CHATCO handles registration, rides, payments, rewards, and safety features.
      </p>
      <p className={styles.termsDate}>Effective date: {POLICY_EFFECTIVE_DATE}</p>
      <div className={styles.policyLinks}>
        <a href="/terms-of-service" target="_blank" rel="noopener noreferrer">Read Terms of Service <span className="sr-only">(opens in a new tab)</span></a>
        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Read Privacy Policy <span className="sr-only">(opens in a new tab)</span></a>
      </div>
      <div className={styles.termsSections}>
        {REGISTRATION_TERMS.map((section, index) => (
          <section key={section.id}>
            <h3>{index + 1}. {section.title}</h3>
            {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
      </div>
      <form
        className={styles.agreementForm}
        aria-busy={busy}
        onSubmit={event => {
          event.preventDefault();
          if (!agreed || busy) return;
          onConfirm({
            terms_accepted: true,
            privacy_acknowledged: true,
            registration_confirmed: true,
            terms_version: POLICY_VERSION,
            privacy_version: POLICY_VERSION,
          });
        }}
      >
        <fieldset disabled={busy} className={styles.agreements}>
          <legend>Confirm your agreements</legend>
          <label>
            <input type="checkbox" required checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} />
            <span>I have read and agree to CHATCO’s <a href="/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</a>.</span>
          </label>
          <label>
            <input type="checkbox" required checked={privacyAcknowledged} onChange={event => setPrivacyAcknowledged(event.target.checked)} />
            <span>I acknowledge CHATCO’s <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, which explains how my information is used.</span>
          </label>
          <label>
            <input type="checkbox" required checked={detailsConfirmed} onChange={event => setDetailsConfirmed(event.target.checked)} />
            <span>I confirm that my registration details are accurate and any documents I submit are genuine and belong to me. I understand that my account requires admin approval before I can log in.</span>
          </label>
        </fieldset>
        <p className={styles.agreementNote}>Selecting “Agree &amp; submit registration” sends your application for admin review. It does not approve your account or sign you in.</p>
        {error && <p role="alert" className={styles.fieldError}>{error}</p>}
        <div className={styles.termsActions}>
          <button type="button" disabled={busy} onClick={onBack} className={styles.backButton}>Back to registration</button>
          <button type="submit" disabled={!agreed || busy} className={styles.primaryButton}>
            {busy ? "Submitting registration…" : "Agree & submit registration"}
          </button>
        </div>
      </form>
    </AuthModal>
  );
}
