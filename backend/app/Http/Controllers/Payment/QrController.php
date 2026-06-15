<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class QrController extends Controller
{
    use ApiResponse;

    public function generate(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function validate(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function scan(): JsonResponse
    {
        return $this->notImplementedResponse();
    }
}