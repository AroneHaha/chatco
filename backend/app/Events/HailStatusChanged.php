<?php

namespace App\Events;

use App\Models\Hail;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched when a hail transitions between lifecycle states
 * (cancelled by commuter, accepted by conductor, rejected by conductor,
 * or auto-expired by the hails:expire scheduled command).
 *
 * Broadcasts to the owning commuter and active vehicle channels so both
 * sides converge immediately after an authorized lifecycle transition.
 *
 * Both private channels are protected by routes/channels.php.
 * Sends immediately after commit without a queue worker. Transport failures
 * are reported while the committed status remains available through the API.
 *
 * Triggered by:
 *   - HailService::cancelHail()
 *   - HailService::acceptHail() (the accepted hail, and each copy on another
 *     unit it cancels)
 *   - HailService::rejectHail()
 *   - HailService::createHail() (an accepted hail whose pin it hides early
 *     because that unit can no longer pick the commuter up)
 *   - HailService::expireStaleHails() (per-hail broadcast in the loop)
 */
class HailStatusChanged implements ShouldBroadcastNow, ShouldRescue
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Hail $hail;

    public function __construct(Hail $hail)
    {
        $this->hail = $hail;
    }

    /** @return array<int, PrivateChannel> */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('commuter.'.$this->hail->commuter_id.'.hails'),
            new PrivateChannel('vehicle.'.$this->hail->vehicle_id.'.hails'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'HailStatusChanged';
    }

    public function broadcastWith(): array
    {
        // No coordinates: the commuter channel only needs to know which unit
        // accepted and when the cooldown ends.
        return [
            'hail_id' => $this->hail->id,
            'status' => $this->hail->status->value,
            'vehicle_id' => $this->hail->vehicle_id,
            'unit_number' => $this->hail->vehicle?->unit_number,
            'expires_at' => $this->hail->expires_at?->toIso8601String(),
        ];
    }
}
