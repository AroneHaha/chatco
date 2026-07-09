'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Keyboard, X, AlertTriangle } from 'lucide-react';

interface QrScannerProps {
  /**
   * Called when a QR is successfully decoded (raw token string extracted
   * from the camera OR pasted into the manual-entry field). The parent
   * decides what to do next (validate → scan → display crew).
   */
  onToken: (token: string) => void;
  /** Clicked when the user wants to cancel out of the scanner. */
  onCancel: () => void;
}

/**
 * Sprint 6 — Commuter Feedback-QR scanner (S6-T6, commuter half).
 *
 * Wraps `html5-qrcode` to read the signed unit-QR via the device camera.
 * A manual-entry fallback is provided for:
 *   - Devices without a camera (desktops, older tablets)
 *   - Browsers that don't grant camera permission
 *   - End-to-end testing without printing a QR
 *
 * The scanner emits the raw token string (the `base64url(payload) + '.' + hex(HMAC)`
 * value) via `onToken`. The parent (the feedback page) then calls
 * `qrFeedbackService.validate(token)` → `qrFeedbackService.scan(token)` to
 * verify + resolve the crew.
 *
 * The camera is started on mount and STOPPED on unmount to free the
 * device's camera (mobile browsers will otherwise keep the camera light on).
 */
export function QrScanner({ onToken, onCancel }: QrScannerProps) {
  const containerId = 'feedback-qr-reader';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState('');
  const [isStarting, setIsStarting] = useState(true);

  // ─── Camera lifecycle ──────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      // stop() throws if the scanner was never started — guard with isScanning.
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // ignore — already stopped or never started
    } finally {
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mode !== 'camera') return;

    let cancelled = false;
    setIsStarting(true);
    setCameraError(null);

    // Small delay so the container div is mounted before html5-qrcode
    // looks for it. The library scans the DOM by ID.
    const startTimeout = setTimeout(async () => {
      if (cancelled) return;
      try {
        const scanner = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Square scan area, 70% of the smaller viewfinder dim.
              const minDim = Math.min(viewfinderWidth, viewfinderHeight);
              const edge = Math.floor(minDim * 0.7);
              return { width: edge, height: edge };
            },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Success — stop the camera + emit the token. The library
            // keeps decoding otherwise, firing onToken repeatedly.
            if (!decodedText) return;
            void stopScanner();
            onToken(decodedText);
          },
          // Per-frame error callback — non-fatal, mostly "no QR found".
          // Swallow to avoid console spam.
          () => undefined
        );

        if (!cancelled) setIsStarting(false);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Unable to start camera.';
        // Common cases: permission denied, no camera, insecure context (http://)
        setCameraError(
          /permission|denied/i.test(message)
            ? 'Camera permission denied. Allow camera access or use manual entry below.'
            : /notfound|not found|no camera/i.test(message)
              ? 'No camera detected on this device. Use manual entry below.'
              : 'Unable to start camera. Try manual entry below.'
        );
        setIsStarting(false);
      }
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(startTimeout);
      void stopScanner();
    };
  }, [mode, onToken, stopScanner]);

  // ─── Mode-switching cleanup ────────────────────────────────────
  const handleSwitchMode = (next: 'camera' | 'manual') => {
    if (next === mode) return;
    // When switching away from camera, stop it immediately so the camera
    // light turns off (mobile UX — users notice if it stays on).
    if (mode === 'camera') void stopScanner();
    setMode(next);
  };

  // ─── Manual entry submit ───────────────────────────────────────
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = manualValue.trim();
    if (!token) return;
    onToken(token);
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="h-full w-full bg-[#050F1A] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-lg">Scan Feedback QR</h2>
            <p className="text-white/40 text-xs mt-0.5">
              Point your camera at the QR inside the jeepney
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-white/40 hover:text-white transition-colors p-2 -mr-2"
            aria-label="Cancel scan"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4 bg-[#071A2E] p-1 rounded-lg border border-white/10">
          <button
            onClick={() => handleSwitchMode('camera')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors ${
              mode === 'camera'
                ? 'bg-[#1A5FB4] text-white shadow'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Camera size={14} />
            Camera
          </button>
          <button
            onClick={() => handleSwitchMode('manual')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors ${
              mode === 'manual'
                ? 'bg-[#1A5FB4] text-white shadow'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Keyboard size={14} />
            Manual
          </button>
        </div>

        {/* Camera viewfinder OR manual entry */}
        {mode === 'camera' ? (
          <div className="space-y-3">
            <div className="relative w-full aspect-square bg-[#071A2E] rounded-2xl overflow-hidden border border-white/10">
              {/* html5-qrcode mounts the video element here */}
              <div id={containerId} className="w-full h-full" />

              {/* Scan frame overlay — visual hint only, the library uses its
                  own qrbox for actual detection. */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#62A0EA] rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#62A0EA] rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#62A0EA] rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#62A0EA] rounded-br-lg" />
                </div>
              </div>

              {/* Loading overlay while the camera is starting */}
              {isStarting && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#050F1A]/80">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#62A0EA] border-t-transparent rounded-full animate-spin" />
                    <p className="text-white/60 text-xs">Starting camera…</p>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle
                  size={16}
                  className="text-amber-400 flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-amber-300 text-xs">{cameraError}</p>
                  <button
                    onClick={() => handleSwitchMode('manual')}
                    className="text-amber-400 text-xs font-semibold mt-1 hover:underline"
                  >
                    Switch to manual entry →
                  </button>
                </div>
              </div>
            )}

            <p className="text-center text-white/30 text-[11px]">
              The QR is printed inside the jeepney unit, near the conductor.
            </p>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="manual-token"
                className="block text-xs font-medium text-white/60 mb-2"
              >
                Paste QR token
              </label>
              <textarea
                id="manual-token"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="Paste the token from the QR here…"
                rows={4}
                className="w-full bg-[#071A2E] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#62A0EA] transition-colors resize-none font-mono text-xs"
                autoFocus
              />
              <p className="text-white/30 text-[11px] mt-1">
                The token is a long string like{' '}
                <code className="text-white/40">eyJ2IjoxLCJ…</code>
              </p>
            </div>
            <button
              type="submit"
              disabled={!manualValue.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-bold transition-colors shadow-lg shadow-[#1A5FB4]/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Keyboard size={16} />
              Verify Token
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
