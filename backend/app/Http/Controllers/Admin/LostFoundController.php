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

    public function index(Request $request): JsonResponse
    {
        $items = LostItem::orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($item) => [
                'id'               => $item->id,
                'itemName'         => $item->item_name,
                'description'      => $item->description ?? '',
                'imageUrl'         => $item->image_url ?? '',
                'plateNumber'      => $item->plate_number ?? 'Unknown',
                'driverName'       => $item->driver_name ?? 'Unknown',
                'conductorName'    => $item->conductor_name ?? 'Unknown',
                'estimatedTimeLost'=> $item->estimated_time_lost ?? 'Unknown',
                'category'         => $item->category ?? 'OTHER',
                'datePosted'       => $item->created_at?->toIso8601String(),
                'reporterName'     => $item->reporter_name ?? 'Unknown',
                'status'           => $item->status,
                'claimedBy'        => $item->claimed_by,
            ]);

        // Claims — table exists
        $claims = Claim::orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($c) => [
                'id'             => $c->id,
                'itemId'         => $c->item_id,
                'claimantName'   => $c->claimant_name,
                'claimantContact'=> $c->claimant_contact,
                'claimantEmail'  => $c->claimant_email,
                'claimDate'      => $c->created_at?->toIso8601String(),
                'status'         => $c->status,
            ]);

        // History log — lost_item_events table doesn't exist yet, derive from lost_items
        $historyLog = LostItem::orderBy('updated_at', 'desc')
            ->limit(50)
            ->get()
            ->flatMap(function ($item) {
                $events = [];
                $events[] = [
                    'id'        => $item->id . '-reported',
                    'itemId'    => $item->id,
                    'action'    => 'Item Reported',
                    'details'   => ($item->reporter_name ?? 'Someone') . " reported a lost item: {$item->item_name}",
                    'timestamp' => $item->created_at?->toIso8601String(),
                ];

                if (in_array($item->status, ['Claimed', 'Returned', 'Released'])) {
                    $events[] = [
                        'id'        => $item->id . '-' . strtolower($item->status),
                        'itemId'    => $item->id,
                        'action'    => 'Item ' . $item->status,
                        'details'   => "Item \"{$item->item_name}\" was marked as {$item->status}.",
                        'timestamp' => $item->updated_at?->toIso8601String(),
                    ];
                }

                return $events;
            });

        return $this->successResponse([
            'items'      => $items,
            'claims'     => $claims,
            'historyLog' => $historyLog,
        ], 'Lost & found data');
    }
}