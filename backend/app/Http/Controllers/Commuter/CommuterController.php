<?php

namespace App\Http\Controllers\Commuter;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class CommuterController extends Controller
{
    use ApiResponse;

    public function profile(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function trips(): JsonResponse
    {
        return $this->notImplementedResponse();
    }

    public function rewards(): JsonResponse
    {
        return $this->notImplementedResponse();
    }
}