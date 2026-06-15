<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use App\Models\LostItem;
use App\Models\Claim;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LostFoundController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/lost-items
     */
    public function index(Request $request): JsonResponse
    {
        $items = LostItem::orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($item) => [
                'id'               => $item->id,
                'itemName'         => $item->item_name,
                'description'      => $item->description,
                'imageUrl'         => $item->image_url,
                'plateNumber'      => $item->plate_number,
                'driverName'       => $item->driver_name,
                'conductorName'    => $item->conductor_name,
                'estimatedTimeLost'=> $item->estimated_time_lost,
                'category'         => $item->category,
                'datePosted'       => $item->date_posted?->toIso8601String(),
                'reporterName'     => $item->reporter_name,
                'status'           => $item->status,
                'claimedBy'        => $item->claimed_by,
            ]);

        $claims = Claim::orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($c) => [
                'id'             => $c->id,
                'itemId'         => $c->item_id,
                'claimantName'   => $c->claimant_name,
                'claimantContact'=> $c->claimant_contact,
                'claimantEmail'  => $c->claimant_email,
                'claimDate'      => $c->claim_date?->toIso8601String(),
                'status'         => $c->status,
            ]);

        return $this->successResponse([
            'items'  => $items,
            'claims' => $claims,
        ], 'Lost & found data');
    }
}