<?php

namespace App\Http\Controllers\Conductor;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class ConductorController extends Controller
{
    use ApiResponse;

    public function updateLocation(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function shiftStatus(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function startShift(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function endShift(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function remittances(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function transactions(): JsonResponse
    {
        return $this->notImplementedResponse();
    }
}