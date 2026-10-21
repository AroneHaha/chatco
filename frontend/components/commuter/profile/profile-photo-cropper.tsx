"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut } from "lucide-react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
// The avatar never renders larger than ~96px; 1024px keeps it sharp on any
// screen while the JPEG stays far below the 3 MB upload limit.
const MAX_OUTPUT_PX = 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't read this photo."));
    image.src = src;
  });
}

/** Draws the selected square of the photo onto a canvas and returns it as a JPEG file. */
async function cropToFile(src: string, area: Area, originalName: string): Promise<File> {
  const image = await loadImage(src);
  const size = Math.min(Math.round(area.width), MAX_OUTPUT_PX);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Couldn't prepare your photo.");
  // JPEG has no transparency: paint white first so transparent PNG areas don't turn black.
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, size, size);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Couldn't prepare your photo.");
  const baseName = originalName.replace(/\.[^.]+$/, "") || "profile-photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

/**
 * Square crop step between choosing a profile photo and uploading it: drag
 * to position, pinch / wheel / slider to zoom. Portaled to <body> because the
 * profile also renders inside a transformed popover, which would otherwise
 * become the containing block for this fixed overlay.
 */
export default function ProfilePhotoCropper({ src, fileName, onCancel, onConfirm }: {
  /** Object URL of the chosen photo; the caller creates and revokes it. */
  src: string;
  fileName: string;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}) {
  const titleId = useId();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<Area | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog (and back to the photo button when it closes).
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !preparing) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, preparing]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);
  const nudgeZoom = (delta: number) => setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(current + delta).toFixed(2))));

  const save = async () => {
    if (!area || preparing) return;
    setPreparing(true);
    setError("");
    try {
      onConfirm(await cropToFile(src, area, fileName));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't prepare your photo.");
      setPreparing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={preparing ? undefined : onCancel} />
      {/* data-profile-subdialog: the profile popover's Escape/Tab handler
          stands down while this is open, so Escape closes only the cropper. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-profile-subdialog=""
        className="relative w-full outline-none max-h-[95dvh] overflow-y-auto rounded-t-2xl border border-white/10 bg-[#071A2E] text-white shadow-2xl pb-safe sm:max-w-md sm:rounded-2xl light:border-gray-200 light:bg-white light:text-gray-900"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5 light:border-gray-200">
          <h2 id={titleId} className="text-lg font-bold">Adjust photo</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={preparing}
            aria-label="Cancel photo change"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40 light:bg-gray-100 light:text-gray-500 light:hover:bg-gray-200 light:hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative h-72 bg-[#050F1A] sm:h-80">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            zoomSpeed={0.2}
            aspect={1}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{ cropAreaStyle: { borderRadius: 16, border: "2px solid rgba(255,255,255,0.9)", color: "rgba(5,15,26,0.6)" } }}
          />
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs text-white/50 light:text-gray-500">Drag to reposition. Pinch, scroll or use the slider to zoom.</p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => nudgeZoom(-ZOOM_STEP * 5)}
              disabled={preparing || zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30 light:text-gray-500 light:hover:bg-gray-100 light:hover:text-gray-900"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={zoom}
              disabled={preparing}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Photo size"
              aria-valuetext={`${Math.round(zoom * 100)}%`}
              className="h-1.5 flex-1 cursor-pointer accent-[#1A5FB4] light:accent-[#1A5FB4]"
            />
            <button
              type="button"
              onClick={() => nudgeZoom(ZOOM_STEP * 5)}
              disabled={preparing || zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30 light:text-gray-500 light:hover:bg-gray-100 light:hover:text-gray-900"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {error && <p role="alert" className="text-xs text-red-300 light:text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={preparing}
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/5 disabled:opacity-40 light:border-gray-200 light:text-gray-700 light:hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={preparing || !area}
              className="flex-[2] rounded-xl bg-[#1A5FB4] py-3 text-sm font-bold text-white transition-colors hover:bg-[#164A8F] active:scale-[0.98] disabled:opacity-50"
            >
              {preparing ? "Preparing…" : "Use photo"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
