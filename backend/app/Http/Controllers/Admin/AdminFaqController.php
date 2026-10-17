<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityLogCategory;
use App\Http\Controllers\Controller;
use App\Models\FaqItem;
use App\Services\ActivityLogService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminFaqController extends Controller
{
    use ApiResponse;

    public function __construct(private ActivityLogService $activityLogService) {}

    public function index(): JsonResponse
    {
        // Group by category, then by manual display order within each — matches
        // how the landing-page FAQ chat renders them.
        $faqs = FaqItem::orderBy('category', 'asc')
            ->orderBy('display_order', 'asc')
            ->get();

        return $this->successResponse($faqs, 'FAQ items retrieved');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:500'],
            'answer' => ['required', 'string'],
            'category' => ['required', 'string', Rule::in(FaqItem::CATEGORIES)],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $faq = FaqItem::create([
            'question' => $validated['question'],
            'answer' => $validated['answer'],
            'category' => $validated['category'],
            'display_order' => $validated['display_order'] ?? ((int) FaqItem::max('display_order') + 1),
        ]);

        $this->activityLogService->record(
            ActivityLogCategory::FAQ,
            "Added FAQ \"{$faq->question}\"",
            $request->user(),
        );

        return $this->successResponse($faq, 'FAQ item created', 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $faq = FaqItem::findOrFail($id);
        $validated = $request->validate([
            'question' => ['sometimes', 'string', 'max:500'],
            'answer' => ['sometimes', 'string'],
            'category' => ['sometimes', 'string', Rule::in(FaqItem::CATEGORIES)],
            'display_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $snapshot = fn (FaqItem $faq) => [
            'question' => $faq->question,
            'answer' => $faq->answer,
            'category' => $faq->category,
            'display_order' => $faq->display_order,
            'is_active' => $faq->is_active ? 'Visible' : 'Hidden',
        ];
        $before = $snapshot($faq);
        $faq->update($validated);

        $changes = ActivityLogService::diff($before, $snapshot($faq), [
            'question' => 'Question',
            'answer' => 'Answer',
            'category' => 'Category',
            'display_order' => 'Order',
            'is_active' => 'Visibility',
        ]);
        if ($changes !== []) {
            $this->activityLogService->record(
                ActivityLogCategory::FAQ,
                "Updated FAQ \"{$faq->question}\": ".ActivityLogService::changedFields($changes),
                $request->user(),
                $changes,
            );
        }

        return $this->successResponse($faq, 'FAQ item updated');
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $faq = FaqItem::findOrFail($id);
        $question = $faq->question;
        $faq->delete();

        $this->activityLogService->record(
            ActivityLogCategory::FAQ,
            "Deleted FAQ \"{$question}\"",
            $request->user(),
        );

        return $this->successResponse(null, 'FAQ item deleted');
    }
}
