<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });

        $this->configureRateLimiters();
    }

    /**
     * Define named rate limiters for the conductor + vehicle API endpoints.
     *
     * Each limiter returns a Limit with a custom 429 response that uses the
     * project's ApiResponse JSON envelope (success/data/message/errors/meta)
     * so the frontend can handle rate-limit errors gracefully.
     *
     * The throttle middleware in routes/api.php references these by name
     * (e.g. throttle:conductor-read) instead of raw numeric limits
     * (e.g. throttle:60,1) so the custom 429 response is applied.
     */
    private function configureRateLimiters(): void
    {
        // Shared 429 response builder — matches ApiResponse trait envelope
        $rateLimitResponse = function () {
            return response()->json([
                'success' => false,
                'data'    => null,
                'message' => 'Too many requests. Please slow down.',
                'errors'  => null,
                'meta'    => null,
            ], 429);
        };

        // Read endpoints — 60 req/min (1 req/s, generous for UI polling)
        RateLimiter::for('conductor-read', function (Request $request) use ($rateLimitResponse) {
            return Limit::perMinute(60)
                ->by($request->user()?->id ?: $request->ip())
                ->response($rateLimitResponse);
        });

        // GPS updates — 30 req/min (supports 5s cadence with ~2.5x headroom)
        RateLimiter::for('conductor-gps', function (Request $request) use ($rateLimitResponse) {
            return Limit::perMinute(30)
                ->by($request->user()?->id ?: $request->ip())
                ->response($rateLimitResponse);
        });

        // Shift mutations — 10 req/min (one active shift per conductor anyway)
        RateLimiter::for('conductor-mutation', function (Request $request) use ($rateLimitResponse) {
            return Limit::perMinute(10)
                ->by($request->user()?->id ?: $request->ip())
                ->response($rateLimitResponse);
        });

        // Capacity status + stubs — 30 req/min
        RateLimiter::for('conductor-write', function (Request $request) use ($rateLimitResponse) {
            return Limit::perMinute(30)
                ->by($request->user()?->id ?: $request->ip())
                ->response($rateLimitResponse);
        });

        // Public vehicle locations endpoint — 60 req/min
        RateLimiter::for('vehicle-locations', function (Request $request) use ($rateLimitResponse) {
            return Limit::perMinute(60)
                ->by($request->user()?->id ?: $request->ip())
                ->response($rateLimitResponse);
        });

        // Commuter hail lifecycle — 10 req/min (one active hail at a time,
        // with headroom for cancel + retry). Used by POST /commuter/hail
        // and DELETE /commuter/hail/{id}.
        RateLimiter::for('commuter-hail', function (Request $request) use ($rateLimitResponse) {
            return Limit::perMinute(10)
                ->by($request->user()?->id ?: $request->ip())
                ->response($rateLimitResponse);
        });
    }
}
