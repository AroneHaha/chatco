<?php

use App\Models\PersonalAccessToken;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->statefulApi();

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'data'    => null,
                    'message' => 'Validation failed',
                    'errors'  => $e->errors(),
                    'meta'    => null,
                ], 422);
            }
        });

        // Render 429 rate-limit responses using the project's ApiResponse JSON
        // envelope so the frontend can handle them gracefully (consistent with
        // the 422 ValidationException handler above).
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'data'    => null,
                    'message' => 'Too many requests. Please slow down.',
                    'errors'  => null,
                    'meta'    => null,
                ], 429);
            }
        });
    })
    ->create();

Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

return $app;
