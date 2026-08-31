"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface IdCaptureModalProps {
  /** Called with the captured photo once the user confirms "Use This Photo". */
  onCapture: (file: File) => void;
  /** Called when the user backs out without capturing (X button or backdrop click). */
  onClose: () => void;
}

/**
 * Live-camera ID capture for signup step 2's "Take a Picture" option.
 *
 * Uses the browser's native getUserMedia + <video>/<canvas> — no external
 * library needed for a plain photo capture (unlike QR decoding elsewhere in
 * the app, which needs html5-qrcode to actually read the code; here we just
 * need a still frame). Falls back gracefully with an inline error + a nudge
 * back to "Upload an Image" when the camera is denied/unavailable, since not
 * every device/browser can grant this.
 */
export default function IdCaptureModal({ onCapture, onClose }: IdCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Guards every async getUserMedia continuation against a stale call racing
  // a newer one — e.g. React StrictMode's dev-only double mount/cleanup, or
  // the user closing the modal while a request is still in flight. Without
  // this, a first call's stream can be stopped by cleanup while its promise
  // is still resolving, and its catch handler then overwrites state a
  // second, successful call already set correctly. Same pattern as the
  // commuter QR scanner's `cancelled` flag.
  const requestIdRef = useRef(0);

  const [isStarting, setIsStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsStarting(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      // A newer call (or an unmount) superseded this one while we awaited —
      // release the camera we just acquired and don't touch state.
      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (requestId === requestIdRef.current) setIsStarting(false);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      const message = err instanceof Error ? err.message : "Unable to access the camera.";
      setCameraError(
        /permission|denied|notallowed/i.test(message)
          ? "Camera permission denied. Allow camera access, or upload an image instead."
          : /notfound|no camera/i.test(message)
            ? "No camera detected on this device. Upload an image instead."
            : "Unable to start the camera. Upload an image instead."
      );
      setIsStarting(false);
    }
  }, []);

  // Start on mount, stop on unmount (mobile browsers keep the camera light on otherwise).
  useEffect(() => {
    void startCamera();
    return () => {
      requestIdRef.current += 1; // invalidate any in-flight request
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Free the captured frame's object URL once it's no longer needed.
  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        stopStream();
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    setCapturedUrl(null);
    setCapturedBlob(null);
    void startCamera();
  };

  const handleUsePhoto = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `id-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file);
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-[#071A2E]">
            {capturedUrl ? "Review Your Photo" : "Take a Picture of Your ID"}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 p-1 -m-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <div className="relative w-full aspect-[4/3] bg-[#071A2E] rounded-xl overflow-hidden">
            {capturedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capturedUrl} alt="Captured ID" className="w-full h-full object-contain" />
            ) : (
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            )}

            {isStarting && !cameraError && !capturedUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#071A2E]/80">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#62A0EA] border-t-transparent rounded-full animate-spin" />
                  <p className="text-white/60 text-xs">Starting camera…</p>
                </div>
              </div>
            )}

            {!capturedUrl && !isStarting && !cameraError && (
              <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-6 rounded-lg" />
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {cameraError && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-700">{cameraError}</p>
            </div>
          )}

          {!cameraError && (
            <p className="mt-3 text-xs text-gray-400 text-center">
              Make sure your ID is well-lit and every detail is readable.
            </p>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          {capturedUrl ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20"
              >
                Use This Photo
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCapture}
              disabled={isStarting || !!cameraError}
              className="flex-1 py-3.5 rounded-xl text-sm font-bold bg-[#1A5FB4] text-white hover:bg-[#164A8F] transition-colors shadow-md shadow-[#1A5FB4]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Capture Photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
