"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import logo from "../../assets/logo-transparent.png";
import styles from "./login.module.css";

export default function AuthModal({ children, footer, busy, headingId, descriptionId, closeLabel, focusSelector, standalone = false, dismissHref, className = "", headerClassName = "", contentClassName = "" }: {
  children: ReactNode;
  footer?: ReactNode;
  busy: boolean;
  headingId: string;
  descriptionId: string;
  closeLabel: string;
  focusSelector: string;
  standalone?: boolean;
  dismissHref?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const backdropPointerDown = useRef(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    const focusFrame = requestAnimationFrame(() => {
      element.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true });
    });
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(focusFrame);
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected && previousFocus !== document.body) {
        previousFocus.focus({ preventScroll: true });
      } else {
        const candidates = document.querySelectorAll<HTMLElement>('a[href="/login"], button[aria-controls="mobile-nav"]');
        Array.from(candidates).find(candidate => candidate.getClientRects().length > 0)?.focus({ preventScroll: true });
      }
    };
  }, [focusSelector]);

  const dismiss = () => {
    if (busy) return;
    if (dismissHref || standalone) router.replace(dismissHref ?? "/");
    else router.back();
  };

  return (
    <dialog
      ref={dialog}
      className={`${styles.shell} ${styles.modal} ${className}`}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      data-lenis-prevent
      onCancel={event => { event.preventDefault(); dismiss(); }}
      onPointerDown={event => { backdropPointerDown.current = event.target === event.currentTarget; }}
      onClick={event => {
        if (backdropPointerDown.current && event.target === event.currentTarget) dismiss();
        backdropPointerDown.current = false;
      }}
    >
      <div>
        <div className={`${styles.modalHeader} ${headerClassName}`}>
          <div className={styles.modalBrand}>
            <Image src={logo} alt="" width={32} height={32} />
            <span>CHATCO</span>
          </div>
          <button type="button" className={styles.close} aria-label={closeLabel} onClick={dismiss} disabled={busy}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className={`${styles.modalForm} ${contentClassName}`}>{children}</div>
        {footer}
      </div>
    </dialog>
  );
}
