<?php

namespace App\Http;

trait ApiResponse
{
    protected function successResponse($data = null, string $message = 'Success', int $code = 200): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => $message,
            'errors' => null,
            'meta' => null,
        ], $code);
    }

    protected function errorResponse(string $message = 'Error', int $code = 400, $errors = null): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'message' => $message,
            'errors' => $errors,
            'meta' => null,
        ], $code);
    }

    protected function notImplementedResponse(): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'message' => 'Not Implemented',
            'errors' => null,
            'meta' => null,
        ], 501);
    }
}