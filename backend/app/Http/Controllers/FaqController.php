<?php

namespace App\Http\Controllers;

use App\Models\FaqItem;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

/**
 * Public FAQ endpoint powering the landing-page FAQ chat bubble.
 *
 * Returns only ACTIVE items, grouped-friendly (ordered by category then
 * display_order). No auth — the landing page is public, like the fare matrix.
 */
class FaqController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $faqs = FaqItem::query()
            ->where('is_active', true)
            ->orderBy('category', 'asc')
            ->orderBy('display_order', 'asc')
            ->get(['id', 'question', 'answer', 'category', 'display_order']);

        return $this->successResponse($faqs, 'FAQ items retrieved');
    }
}
