import { api, ApiError } from "@/lib/api/client";
import { COMMUTER_API } from "@/lib/commuter/endpoints";

export interface EmailChangeFlow {
  id: string;
  step: "identity" | "email" | "verify";
  current_email: string;
  new_email: string | null;
  expires_at: string;
  old_code_sent: boolean;
  new_code_sent: boolean;
  old_code_expires_at: string | null;
  new_code_expires_at: string | null;
  old_attempts_left: number;
  new_attempts_left: number;
}

export interface EmailChangeState {
  flow: EmailChangeFlow | null;
  attempts_left: number;
  blocked_until: string | null;
  server_now: string;
  password_retry_after: number;
  old_resend_in_seconds: number;
  new_resend_in_seconds: number;
}

interface Envelope<T> {
  data: T;
  message: string;
  errors?: Record<string, string[]> | null;
  meta?: { reason?: string; retry_after?: number; retry_at?: string };
}

export class EmailChangeError extends Error {
  constructor(public status: number, message: string, public reason = "error", public field?: string, public retryAfter = 0) {
    super(message);
    this.name = "EmailChangeError";
  }
}

async function translate<T>(operation: () => Promise<Envelope<T>>): Promise<T> {
  try {
    return (await operation()).data;
  } catch (error) {
    if (error instanceof ApiError) {
      const body = error.body as Envelope<unknown> | undefined;
      const field = Object.keys(body?.errors ?? {})[0];
      const message = field ? body?.errors?.[field]?.[0] : body?.message;
      throw new EmailChangeError(error.status, message ?? "We could not process this request. Please try again.", body?.meta?.reason, field, body?.meta?.retry_after ?? (error.status === 429 ? 60 : 0));
    }
    throw new EmailChangeError(0, "Unable to reach the server. Check your connection and try again.");
  }
}

export const getEmailChangeState = () => translate<EmailChangeState>(() => api.get(COMMUTER_API.changeEmail.state, undefined, { cache: "no-store" }));
export const startEmailChange = () => translate<EmailChangeState>(() => api.post(COMMUTER_API.changeEmail.start));
export const sendEmailChangeCode = (requestId: string, stage: "old" | "new", email?: string) => translate<EmailChangeState>(() => api.post(COMMUTER_API.changeEmail.sendCode, { request_id: requestId, stage, email }));
export const verifyEmailChangeIdentity = (requestId: string, method: "email" | "password", value: string) => translate<EmailChangeState>(() => api.post(COMMUTER_API.changeEmail.verifyIdentity, { request_id: requestId, method, ...(method === "email" ? { code: value } : { current_password: value }) }));
export const confirmEmailChange = (requestId: string, code: string) => translate<{ email: string }>(() => api.post(COMMUTER_API.changeEmail.confirm, { request_id: requestId, code }));
export const cancelEmailChange = (requestId: string) => translate<null>(() => api.post(COMMUTER_API.changeEmail.cancel, { request_id: requestId }));
