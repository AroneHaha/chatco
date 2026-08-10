<?php

namespace App\Events;

use App\Models\Hail;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched when a commuter creates a new hail.
 *
 * Broadcasts on the vehicle-scoped channel so the conductor currently on
 * shift for that vehicle receives the new pending hail in real time.
 *
 * Channel: private-vehicle.{vehicle_id}.hails. Authorization is restricted to
 * the conductor currently operating that vehicle.
 *
 * Triggered by: HailService::createHail() after the row commits.
 */
class HailCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Hail $hail;

    public function __construct(Hail $hail)
    {
        $this->hail = $hail;
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('vehicle.'.$this->hail->vehicle_id.'.hails');
    }

    public function broadcastAs(): string
    {
        return 'HailCreated';
    }

    public function broadcastWith(): array
    {
        // Load commuter + profile if not already eager-loaded
        $commuter = $this->hail->commuter()->with('commuterProfile')->first();

        $commuterName = $commuter?->getDisplayName() ?? 'Unknown Commuter';

        return [
            'hail_id' => $this->hail->id,
            'commuter_name' => $commuterName,
            'commuter_lat' => (float) $this->hail->commuter_lat,
            'commuter_lng' => (float) $this->hail->commuter_lng,
            'distance_m' => (float) $this->hail->distance_m,
            'expires_at' => $this->hail->expires_at->toIso8601String(),
        ];
    }
}
