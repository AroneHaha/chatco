"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw, ScanLine, UserX } from "lucide-react";
import {
  parseUnitQr,
  primeScannedCrew,
  scanPublic,
  QrFeedbackError,
  type ParsedUnitQr,
  type QrFeedbackErrorCode,
} from "@/lib/commuter/services/qr-feedback.service";
import { QrScanner } from "./qr-scanner";
import { FeedbackModalContent, FeedbackModalFrame } from "./feedback-modal";
import { NO_CREW_SUBTITLE, NO_CREW_TITLE, NoCrewBody } from "./no-crew-on-duty";
import { errorMessageForCode, errorTitleForCode } from "./scan-error-copy";

type Phase =
  | { kind: "scanning" }
  | { kind: "resolving" }
  | { kind: "no_crew"; unit: ParsedUnitQr }
  | { kind: "error"; code: QrFeedbackErrorCode; message: string };

/** Tailwind's `lg` breakpoint — where the result stays in this modal. */
const LARGE_SCREEN_QUERY = "(min-width: 1024px)";

function toErrorPhase(err: unknown): Phase {
  if (err instanceof QrFeedbackError) {
    return { kind: "error", code: err.code, message: err.message };
  }
  return {
    kind: "error",
    code: "network",
    message: err instanceof Error ? err.message : "Unable to resolve crew for this unit.",
  };
}

/**
 * The nav-bar Feedback scan modal, opened over whatever commuter page is
 * open.
 *
 * At lg+ the crew lookup runs here too: the modal swaps from the scanner to
 * a loading state, then to the result, without leaving the current page.
 * Only a resolved crew routes to /feedback, since the rating form is a full
 * page; the crew is primed so the page doesn't repeat the lookup. Below lg
 * the token is handed straight to /feedback as before, where the results
 * are full-screen states.
 */
export function FeedbackScanModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "scanning" });
  const lastRawRef = useRef<string | null>(null);

  // A lookup can settle after the modal closed or after "Check again"
  // started a newer one; neither may navigate or update state.
  const attemptRef = useRef(0);
  const isClosedRef = useRef(false);
  useEffect(() => {
    isClosedRef.current = false;
    return () => {
      isClosedRef.current = true;
    };
  }, []);

  // Read through a ref so `resolve` stays stable — QrScanner restarts the
  // camera whenever its onToken callback changes identity.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const openRatingForm = useCallback(
    (raw: string) => {
      onCloseRef.current();
      router.push(`/feedback?token=${encodeURIComponent(raw)}`);
    },
    [router]
  );

  const resolve = useCallback(
    async (raw: string) => {
      lastRawRef.current = raw;

      if (!window.matchMedia(LARGE_SCREEN_QUERY).matches) {
        openRatingForm(raw);
        return;
      }

      let unit: ParsedUnitQr;
      try {
        unit = parseUnitQr(raw);
      } catch (err) {
        setPhase(toErrorPhase(err));
        return;
      }

      const attempt = ++attemptRef.current;
      setPhase({ kind: "resolving" });
      try {
        const crew = await scanPublic(unit.vehicleId);
        if (isClosedRef.current || attempt !== attemptRef.current) return;
        primeScannedCrew(crew);
        openRatingForm(raw);
      } catch (err) {
        if (isClosedRef.current || attempt !== attemptRef.current) return;
        setPhase(
          err instanceof QrFeedbackError && err.code === "no_crew_today"
            ? { kind: "no_crew", unit }
            : toErrorPhase(err)
        );
      }
    },
    [openRatingForm]
  );

  const handleToken = useCallback((raw: string) => void resolve(raw), [resolve]);

  const checkAgain = () => {
    if (lastRawRef.current) void resolve(lastRawRef.current);
  };
  const scanAnother = () => setPhase({ kind: "scanning" });

  if (phase.kind === "scanning") {
    return (
      <FeedbackModalFrame label="Scan Feedback QR">
        <QrScanner variant="modal" onToken={handleToken} onCancel={onClose} />
      </FeedbackModalFrame>
    );
  }

  if (phase.kind === "resolving") {
    return (
      <FeedbackModalFrame label="Checking this unit">
        <FeedbackModalContent
          icon={ScanLine}
          title="Checking this unit"
          subtitle="Looking up today's driver and conductor"
          onClose={onClose}
        >
          <div role="status" aria-live="polite" className="flex flex-col items-center py-10 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-[#62A0EA] border-t-transparent light:border-[#1A5FB4] light:border-t-transparent animate-spin" />
            <p className="text-white/50 text-sm mt-4 light:text-gray-500">Resolving today&apos;s crew…</p>
          </div>
        </FeedbackModalContent>
      </FeedbackModalFrame>
    );
  }

  if (phase.kind === "no_crew") {
    return (
      <FeedbackModalFrame label={NO_CREW_TITLE}>
        <FeedbackModalContent icon={UserX} title={NO_CREW_TITLE} subtitle={NO_CREW_SUBTITLE} onClose={onClose}>
          <NoCrewBody
            unitNumber={phase.unit.unitNumber}
            plateNumber={phase.unit.plateNumber}
            onCheckAgain={checkAgain}
            onScanAnother={scanAnother}
          />
        </FeedbackModalContent>
      </FeedbackModalFrame>
    );
  }

  const title = errorTitleForCode(phase.code);
  return (
    <FeedbackModalFrame label={title}>
      <FeedbackModalContent icon={AlertTriangle} title={title} subtitle="The scan didn't go through" onClose={onClose}>
        <p role="alert" className="text-sm text-white/60 leading-relaxed light:text-gray-600">
          {errorMessageForCode(phase.code, phase.message)}
        </p>
        <button
          type="button"
          onClick={scanAnother}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-semibold transition-[background-color,transform] active:scale-[0.98] shadow-lg shadow-[#1A5FB4]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]"
        >
          <RotateCcw size={15} />
          Try again
        </button>
      </FeedbackModalContent>
    </FeedbackModalFrame>
  );
}
