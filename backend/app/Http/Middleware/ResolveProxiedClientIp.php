<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restore the real client IP for requests relayed by the Next.js server.
 *
 * The browser never talks to Laravel directly: every call goes through a
 * Next.js route handler, so Laravel's socket peer is the Next.js host and
 * `$request->ip()` is the same for every user. That collapses every per-IP
 * rate-limit bucket (`throttle:auth` is 10/min per IP) into one shared bucket.
 *
 * The frontend sends the client IP in `X-Chatco-Client-IP` together with a
 * shared secret in `X-Chatco-Proxy-Secret`. The IP is honoured ONLY when the
 * secret matches, so a caller reaching Laravel directly cannot pick its own IP
 * to dodge a limiter. The secret is used instead of a trusted-proxy IP list
 * because the frontend is hosted on Vercel, whose egress addresses are not
 * stable and cannot be allow-listed.
 *
 * With FRONTEND_PROXY_SECRET unset this is a no-op and `$request->ip()` is
 * unchanged.
 */
class ResolveProxiedClientIp
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('services.frontend_proxy.secret');

        if ($secret !== '') {
            $provided = $request->header('X-Chatco-Proxy-Secret');
            $clientIp = $request->header('X-Chatco-Client-IP');

            if (
                is_string($provided)
                && hash_equals($secret, $provided)
                && is_string($clientIp)
                && filter_var($clientIp, FILTER_VALIDATE_IP) !== false
            ) {
                // Symfony's getClientIp() reads REMOTE_ADDR on every call, so
                // ip() and everything keyed on it (rate limiters) sees it.
                $request->server->set('REMOTE_ADDR', $clientIp);
            }
        }

        return $next($request);
    }
}
