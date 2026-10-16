/**
 * Password policy — mirrors App\Rules\StrongPassword on the backend. Shown as
 * a live checklist so the requirements are visible while typing rather than
 * arriving as an error after submitting. Used by the commuter sign-up form
 * and the admin password change (Settings > Profile & Security).
 */
export const PASSWORD_RULES: { id: string; label: string; test: (v: string) => boolean }[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "number", label: "One number", test: (v) => /[0-9]/.test(v) },
  { id: "symbol", label: "One symbol (! ? @ #)", test: (v) => /[^A-Za-z0-9\s]/.test(v) },
];
