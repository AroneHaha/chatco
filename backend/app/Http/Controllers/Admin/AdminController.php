<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    use ApiResponse;

    public function dashboard(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function users(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function drivers(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function vehicles(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function routes(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function transactions(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function remittances(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function announcements(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function lostItems(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function shiftLogs(): JsonResponse
    {
        return $this->notImplementedResponse();
    }
}