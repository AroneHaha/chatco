<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });

        $this->configureRateLimiting();
    }

    /**
     * Configure named rate limiters used by route throttle middleware.
     *
     * Limiters are keyed per-user (falling back to IP for unauthenticated
     * requests, though all routes that use these limiters require auth).
     */
    protected function configureRateLimiting(): void
    {
        // Commuter hail lifecycle: 10 req/min per user.
        // Allows one hail at a time with headroom for cancel + retry.
        // Used by: POST /commuter/hail, DELETE /commuter/hail/{id}
        RateLimiter::for('commuter-hail', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        // Conductor read endpoints: 60 req/min per user.
        // Used by: GET /conductor/hails (and future conductor read endpoints).
        RateLimiter::for('conductor-read', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // Conductor mutation endpoints: 30 req/min per user.
        // Used by: POST /conductor/hails/{id}/accept, POST /conductor/hails/{id}/reject
        // (and future conductor mutation endpoints).
        RateLimiter::for('conductor-mutation', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });
    }
}

