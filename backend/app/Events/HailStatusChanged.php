<?php

namespace App\Events;

use App\Models\Hail;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
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
        return [
            'hail_id' => $this->hail->id,
            'status' => $this->hail->status->value,
        ];
    }
}
