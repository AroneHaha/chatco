import { NextResponse } from "next/server";

export function jsonData<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

/**
 * Return a validation error response that mirrors Laravel's 422 shape:
 *   { message: "...", errors: { field: ["msg", "msg", ...] } }
 *
 * Use this when forwarding Laravel validation failures so the frontend
 * can extract field-specific error messages.
 */
export function jsonValidationError(
  message: string,
  errors: Record<string, string[]> | null,
  status = 422
) {
  return NextResponse.json({ message, errors: errors ?? {} }, { status });
}
