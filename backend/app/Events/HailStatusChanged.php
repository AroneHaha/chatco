<?php

namespace App\Events;

use App\Enums\HailStatus;
use App\Models\Hail;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched when a hail transitions between lifecycle states
 * (cancelled by commuter, accepted by conductor, rejected by conductor).
 *
 * Broadcasts on the hail-specific channel so both the owning commuter
 * and the conductor on shift for the related vehicle receive the
 * status change in real time.
 *
 * Channel: hail.{hailId}  (public — matches existing `vehicles`
 * channel convention)
 */
class HailStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Hail $hail;

    public HailStatus $previousStatus;

    public function __construct(Hail $hail, HailStatus $previousStatus)
    {
        $this->hail = $hail;
        $this->previousStatus = $previousStatus;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('hail.' . $this->hail->id);
    }

    public function broadcastAs(): string
    {
        return 'HailStatusChanged';
    }

    public function broadcastWith(): array
    {
        return [
            'id'              => $this->hail->id,
            'commuter_id'     => $this->hail->commuter_id,
            'vehicle_id'      => $this->hail->vehicle_id,
            'conductor_id'    => $this->hail->conductor_id,
            'previous_status' => $this->previousStatus->value,
            'current_status'  => $this->hail->status->value,
            'updated_at'      => $this->hail->updated_at->toIso8601String(),
        ];
    }
}
