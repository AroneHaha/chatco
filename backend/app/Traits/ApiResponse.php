<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    /**
     * Return a successful API response.
     *
     * @param  mixed   $data    Response payload
     * @param  string  $message Human-readable message
     * @param  int     $status  HTTP status code
     */
    protected function successResponse(mixed $data = null, string $message = 'Success', int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $data,
            'message' => $message,
            'errors'  => null,
            'meta'    => null,
        ], $status);
    }

    /**
     * Return an error API response.
     *
     * @param  string       $message Human-readable error message
     * @param  int          $status  HTTP status code
     * @param  mixed|null   $errors  Validation errors or error details
     */
    protected function errorResponse(string $message = 'Error', int $status = 400, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'data'    => null,
            'message' => $message,
            'errors'  => $errors,
            'meta'    => null,
        ], $status);
    }

    /**
     * Return a 501 Not Implemented placeholder response.
     * Used for all Sprint 1 stub endpoints.
     */
    protected function notImplementedResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'data'    => null,
            'message' => 'Not Implemented',
            'errors'  => null,
            'meta'    => null,
        ], 501);
    }
}
