/**
 * Server-only. Headers that let Laravel see the REAL client IP.
 *
 * The browser only ever talks to these Next.js route handlers, so from
 * Laravel's side every request comes from this server. Its per-IP rate limits
 * (`throttle:auth`, 10/min) would then be one bucket shared by all users.
 * Laravel's ResolveProxiedClientIp middleware restores the IP from these
 * headers, but only when the shared secret matches — a request sent straight to
 * Laravel cannot choose its own IP.
 *
 * Returns `{}` when FRONTEND_PROXY_SECRET is unset (Laravel then keeps using
 * the socket IP, as before) or when no client IP can be determined.
 */
export function clientIpHeaders(request: Request): Record<string, string> {
  const secret = process.env.FRONTEND_PROXY_SECRET;
  if (!secret) return {};

  const ip = resolveClientIp(request);
  if (!ip) return {};

  return { "X-Chatco-Client-IP": ip, "X-Chatco-Proxy-Secret": secret };
}

/**
 * The address the platform's edge saw. Uses the LAST X-Forwarded-For entry —
 * the one appended by the nearest proxy — because earlier entries are
 * supplied by the client and can be forged. Vercel overwrites the header with
 * a single value, so this is that value there. Falls back to X-Real-IP.
 */
function resolveClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").map((part) => part.trim()).filter(Boolean).pop();
    if (last) return last;
  }

  return request.headers.get("x-real-ip")?.trim() || null;
}
