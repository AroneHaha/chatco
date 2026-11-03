"use client";

// Slide-to-send for the commuter and conductor SOS confirm screens. A slide
// cannot be completed by a stray tap, so accidental alerts stay rare. Same
// SlideCommit setup as the conductor's Take a Break slider, in SOS red.
import { useEffect, useRef, useState } from "react";
import SlideCommit from "@/components/ui/slide-commit";
import { useCommuterTheme } from "@/contexts/commuter-theme-context";

export default function SosSlideToSend({ onSend }: { onSend: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(280);
  // Inline slider colours can't use `light:` classes.
  const isLight = useCommuterTheme() === "light";
  const red = isLight ? "#DC2626" : "#EF4444";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    // --sos-outline feeds .sos-slider in slide-commit.css: the track needs an
    // edge, since a fill alone vanished into the conductor confirm panel.
    <div ref={containerRef} style={{ "--sos-outline": isLight ? "#FCA5A5" : "#991B1B" } as React.CSSProperties}>
      <SlideCommit
        label="Slide to send SOS"
        doneLabel="Sending"
        errorLabel="Slide to try again"
        // The parent moves to its locating screen right away, which unmounts this.
        onConfirm={onSend}
        holdMs={0}
        width={width}
        height={56}
        commitRatio={0.9}
        // Not #1A2540: that is the conductor SOS panel's own fill.
        trackColor={isLight ? "#FEF2F2" : "#0B1120"}
        handleColor={red}
        successColor={red}
        className="conductor-duty-slider sos-slider"
      />
    </div>
  );
}
