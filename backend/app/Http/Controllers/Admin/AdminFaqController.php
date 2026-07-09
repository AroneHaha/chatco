<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FaqItem;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminFaqController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $faqs = FaqItem::orderBy('display_order', 'asc')->get();
        return $this->successResponse($faqs, 'FAQ items retrieved');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:500'],
            'answer' => ['required', 'string'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $faq = FaqItem::create([
            'question' => $validated['question'],
            'answer' => $validated['answer'],
            'display_order' => $validated['display_order'] ?? (FaqItem::max('display_order') + 1 ?? 0),
        ]);
        return $this->successResponse($faq, 'FAQ item created', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $faq = FaqItem::findOrFail($id);
        $validated = $request->validate([
            'question' => ['sometimes', 'string', 'max:500'],
            'answer' => ['sometimes', 'string'],
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $faq->update($validated);
        return $this->successResponse($faq, 'FAQ item updated');
    }

    public function destroy(string $id): JsonResponse
    {
        $faq = FaqItem::findOrFail($id);
        $faq->delete();
        return $this->successResponse(null, 'FAQ item deleted');
    }
}
