// app/types/user.types.ts
// DEPRECATED: This file is kept for backward compatibility only.
// Import from @/types instead:
//   import type { CommuterProfile as User } from "@/types";
//   import { getCommuterTypeLabel } from "@/types";
//
// The canonical User type is now CommuterProfile in @/types/user.
// The old "Regular" | "Student" format has been replaced by
// the canonical "REGULAR" | "STUDENT" format.

import type { CommuterProfile } from "@/types";

/** @deprecated Use CommuterProfile from @/types instead */
export interface User {
  id: string;
  firstName: string;
  surname: string;
  commuterType: CommuterProfile["commuterType"];
}
