<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    protected function successResponse(mixed $data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        return response()->json([
            'success'  => true,
            'data'     => $data,
            'message'  => $message,
            'errors'   => null,
            'meta'     => null,
        ], $status);
    }

    protected function successResponseWithMeta(mixed $data = null, string $message = 'Success', ?array $meta = null, int $status = 200): JsonResponse
    {
        return response()->json([
            'success'  => true,
            'data'     => $data,
            'message'  => $message,
            'errors'   => null,
            'meta'     => $meta,
        ], $status);
    }

    protected function errorResponse(string $message = 'Error', int $status = 400, ?array $errors = null): JsonResponse
    {
        return response()->json([
            'success'  => false,
            'data'     => null,
            'message'  => $message,
            'errors'   => $errors,
            'meta'     => null,
        ], $status);
    }

    protected function validationErrorResponse(string $message = 'Validation failed', array $errors = []): JsonResponse
    {
        return response()->json([
            'success'  => false,
            'data'     => null,
            'message'  => $message,
            'errors'   => $errors,
            'meta'     => null,
        ], 422);
    }
}