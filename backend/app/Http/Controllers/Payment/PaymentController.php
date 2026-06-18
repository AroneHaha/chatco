<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    use ApiResponse;

    public function initiate(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function verify(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function history(): JsonResponse
    {
        return $this->notImplementedResponse();
    }
}