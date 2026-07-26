// lib/auth/email-verification.ts
//
// Sign-up email verification: request a 6-digit code, then check it.
// Both calls proxy through /api/auth/register/* to Laravel.

export class VerificationError extends Error {
  /** Field-keyed messages from a 422 (e.g. { email: ["..."] }). */
  errors: Record<string, string[]>;
  status: number;

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = "VerificationError";
    this.status = status;
    this.errors = errors;
  }

  /** True when the code is spent or rate-limited — the user needs a new one. */
  get needsNewCode(): boolean {
    return this.status === 429;
  }
}

export interface SendCodeResult {
  expires_in_minutes: number;
  resend_in_seconds: number;
}

async function post(path: string, payload: Record<string, string | undefined>) {
  let res: Response;

  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new VerificationError(
      "Unable to reach the server. Check your connection and try again.",
      0
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new VerificationError(
      data?.message ?? "Something went wrong. Please try again.",
      res.status,
      data?.errors ?? {}
    );
  }

  return data;
}

/**
 * Mail a verification code to `email`.
 *
 * The contact number rides along so the backend can apply the same
 * rejection-cooldown check registration would — better to hear about a block
 * now than after filling in the rest of the form.
 */
export async function sendVerificationCode(
  email: string,
  contactNumber?: string
): Promise<SendCodeResult> {
  const data = await post("/api/auth/register/send-code", {
    email,
    contact_number: contactNumber,
  });

  return (data?.data ?? { expires_in_minutes: 15, resend_in_seconds: 60 }) as SendCodeResult;
}

/** Check a submitted code. Resolves on success, throws VerificationError otherwise. */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  await post("/api/auth/register/verify-code", { email, code });
}
