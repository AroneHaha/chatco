import { mdiAccount } from "@mdi/js";

export const COMMUTER_PIN_SIZE = 30;

/**
 * HTML for a commuter's map pin (Leaflet DivIcon `html`): the MDI account
 * icon in white on a solid circle. Shared by the commuter, conductor and
 * admin maps so a commuter reads the same on all three.
 *
 * - CHATCO Blue (#1A5FB4): a commuter's location ("You are here").
 * - Signal Orange (#FF6D3A): a commuter who is hailing.
 */
export function commuterPinHtml(fill: string): string {
  return `<div style="width: ${COMMUTER_PIN_SIZE}px; height: ${COMMUTER_PIN_SIZE}px; background: ${fill}; border: 2px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true"><path d="${mdiAccount}" /></svg>
  </div>`;
}
