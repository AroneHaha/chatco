<?php

namespace App\Http\Controllers\Commuter;

use App\Http\Controllers\Controller;
use App\Services\CommuterEmailChangeService;
use App\Traits\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmailChangeController extends Controller
{
    use ApiResponse;

    public function __construct(private CommuterEmailChangeService $service) {}

    public function state(Request $request): JsonResponse
    {
        return $this->respond($request, fn ($session) => $this->service->state($request->user(), $session));
    }

    public function start(Request $request): JsonResponse
    {
        return $this->respond($request, fn ($session) => $this->service->start($request->user(), $session));
    }

    public function sendCode(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => Str::lower(trim($request->input('email')))]);
        }
        $data = $request->validate([
            'request_id' => ['required', 'uuid'],
            'stage' => ['required', Rule::in(['old', 'new'])],
            'email' => ['required_if:stage,new', 'nullable', 'string', 'email:rfc', 'max:255'],
        ]);

        return $this->respond($request, fn ($session) => $this->service->sendCode($request->user(), $session, $data['request_id'], $data['stage'], $data['email'] ?? null));
    }

    public function verifyIdentity(Request $request): JsonResponse
    {
        $data = $request->validate([
            'request_id' => ['required', 'uuid'],
            'method' => ['required', Rule::in(['email', 'password'])],
            'current_password' => ['required_if:method,password', 'nullable', 'string', 'max:1024'],
            'code' => ['required_if:method,email', 'nullable', 'string', 'regex:/^[0-9]{6}$/'],
        ]);

        return $this->respond($request, fn ($session) => $this->service->verifyIdentity($request->user(), $session, $data['request_id'], $data['method'], $data['current_password'] ?? null, $data['code'] ?? null));
    }

    public function confirm(Request $request): JsonResponse
    {
        $data = $request->validate(['request_id' => ['required', 'uuid'], 'code' => ['required', 'string', 'regex:/^[0-9]{6}$/']]);

        return $this->respond($request, fn ($session) => $this->service->confirm($request->user(), $session, $data['request_id'], $data['code']));
    }

    public function cancel(Request $request): JsonResponse
    {
        $data = $request->validate(['request_id' => ['required', 'uuid']]);

        return $this->respond($request, fn ($session) => $this->service->cancel($request->user(), $session, $data['request_id']));
    }

    private function respond(Request $request, callable $operation): JsonResponse
    {
        $credential = $request->bearerToken() ?: ($request->hasSession() ? $request->session()->getId() : null);
        if (! $credential) {
            throw new AuthenticationException;
        }
        try {
            $result = $operation(hash('sha256', $credential));
        } catch (\Throwable $e) {
            Log::error('Email-change operation failed', ['user_id' => $request->user()->id, 'exception' => get_class($e)]);

            return $this->errorResponse('We could not process the email change right now. Please try again.', 503);
        }
        $status = $result['status'];
        unset($result['status']);
        $response = response()->json($result, $status)->header('Cache-Control', 'no-store');
        if (isset($result['meta']['retry_after'])) {
            $response->header('Retry-After', $result['meta']['retry_after']);
        }

        return $response;
    }
}
