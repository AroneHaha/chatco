/**
 * Unit status options (Available / Standing / Full), shared by the mobile
 * card, the 1024–1279px card and the xl:+ bar. Solid in every state: the
 * selected option is CHATCO Blue, the others a raised neutral surface. There
 * is no colour per status; the dot beside the heading carries that.
 */
export function unitStatusOptionClass(selected: boolean): string {
  return selected
    ? "border-[#1A5FB4] bg-[#1A5FB4] text-white"
    : "border-white/10 bg-[#12304F] text-white/75 hover:bg-[#173A5E] hover:text-white light:border-gray-200 light:bg-white light:text-gray-700 light:hover:bg-gray-100 light:hover:text-gray-900";
}

/** The panel the options sit on in the two cards (the bar has none): the same
 * navy tone as the Total Collected panel, not a darker inset. */
export const UNIT_STATUS_PANEL_CLASS = "border-white/10 bg-[#0B223A] light:border-gray-200 light:bg-gray-50";
