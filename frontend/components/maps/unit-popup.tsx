"use client";

import { useEffect, type ReactNode } from "react";
import { useLeafletContext } from "@react-leaflet/core";
import { Popup } from "react-leaflet";
import { Car } from "lucide-react";
import styles from "./unit-popup.module.css";

type Tone = "success" | "warning" | "danger" | "info";

export function capacityTone(capacity: string): Tone {
  switch (capacity.toUpperCase()) {
    case "FULL": return "danger";
    case "STANDING": return "warning";
    default: return "success";
  }
}

interface UnitPopupProps {
  title: string;
  subtitle?: string;
  status: { label: string; tone: Tone };
  details: { label: string; value: ReactNode }[];
  notes?: { message: string; tone: Tone }[];
}

export default function UnitPopup({ title, subtitle = "Unit details", status, details, notes = [] }: UnitPopupProps) {
  const { overlayContainer: marker } = useLeafletContext();

  useEffect(() => {
    if (!marker) return;
    const hoverQuery = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let popupElement: HTMLElement | undefined;
    let openedByHover = false;

    const cancelClose = () => {
      if (closeTimer !== undefined) clearTimeout(closeTimer);
      closeTimer = undefined;
    };
    const scheduleClose = () => {
      if (!openedByHover) return;
      cancelClose();
      closeTimer = setTimeout(() => marker.closePopup(), 200);
    };
    const openOnHover = () => {
      if (!hoverQuery.matches) return;
      cancelClose();
      const popup = marker.getPopup();
      if (!popup) return;
      popup.options.autoPan = false;
      openedByHover = true;
      marker.openPopup();
    };
    const detachPopup = () => {
      popupElement?.removeEventListener("mouseenter", cancelClose);
      popupElement?.removeEventListener("mouseleave", scheduleClose);
      popupElement = undefined;
    };
    const onOpen = () => {
      detachPopup();
      popupElement = marker.getPopup()?.getElement();
      popupElement?.addEventListener("mouseenter", cancelClose);
      popupElement?.addEventListener("mouseleave", scheduleClose);
    };
    const onClose = () => {
      cancelClose();
      detachPopup();
      openedByHover = false;
      const popup = marker.getPopup();
      if (popup) popup.options.autoPan = true;
    };
    const onModeChange = () => {
      if (openedByHover) marker.closePopup();
    };
    const events = { mouseover: openOnHover, mouseout: scheduleClose, popupopen: onOpen, popupclose: onClose };
    marker.on(events);
    hoverQuery.addEventListener("change", onModeChange);
    return () => {
      cancelClose();
      detachPopup();
      marker.off(events);
      hoverQuery.removeEventListener("change", onModeChange);
    };
  }, [marker]);

  return (
    <Popup className={styles.popup} minWidth={240} maxWidth={300} autoPanPadding={[20, 20]}>
      <section aria-label={`${subtitle}: ${title}`}>
        <div className={styles.header}>
          <span className={styles.icon}><Car size={19} aria-hidden="true" /></span>
          <div className={styles.heading}>
            <div className={styles.subtitle}>{subtitle}</div>
            <div className={styles.title}>{title}</div>
          </div>
        </div>
        <div className={styles.body}>
          <span className={styles.badge} data-tone={status.tone}><span aria-hidden="true" />{status.label}</span>
          <dl className={styles.details}>
            {details.map(detail => (
              <div key={detail.label} className={styles.row}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
          {notes.length > 0 && <div className={styles.notes}>
            {notes.map(note => <div key={note.message} className={styles.note} data-tone={note.tone}>{note.message}</div>)}
          </div>}
        </div>
      </section>
    </Popup>
  );
}
