<?php

namespace App\Events;

use App\Models\Hail;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched when a hail transitions between lifecycle states
 * (cancelled by commuter, accepted by conductor, rejected by conductor,
 * or auto-expired by the hails:expire scheduled command).
 *
 * Broadcasts on the commuter-scoped channel so the owning commuter
 * receives the status change in real time, reducing polling dependence.
 *
 * Channel: commuter.{commuter_id}.hails  (public — matches existing
 * `vehicles` channel convention)
 *
 * Triggered by:
 *   - HailService::cancelHail()
 *   - HailService::acceptHail()
 *   - HailService::rejectHail()
 *   - HailService::expireStaleHails() (per-hail broadcast in the loop)
 */
class HailStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Hail $hail;

    public function __construct(Hail $hail)
    {
        $this->hail = $hail;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('commuter.' . $this->hail->commuter_id . '.hails');
    }

    public function broadcastAs(): string
    {
        return 'HailStatusChanged';
    }

    public function broadcastWith(): array
    {
        return [
            'hail_id'      => $this->hail->id,
            'status'       => $this->hail->status->value,
            'conductor_id' => $this->hail->conductor_id,
            'vehicle_id'   => $this->hail->vehicle_id,
        ];
    }
}
