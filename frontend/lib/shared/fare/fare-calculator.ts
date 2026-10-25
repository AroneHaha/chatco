// lib/fare-calculator.ts
// Fare display helpers shared by the commuter and conductor UIs.
//
// CommuterType is imported from @/types (canonical source).
// Fare amounts come from fare-matrix.service.ts (backend fare matrix).

// Re-export CommuterType for backward compatibility with existing consumers
export type { CommuterType } from "@/types";

// ─── Utility Exports (used by commuter UI components) ───────────────────────

/** Format a number as Philippine peso string */
export { formatCurrency } from "../../utils/format";

/** Get the display label for a commuter type */
export { getCommuterTypeLabel } from "@/types/user";
