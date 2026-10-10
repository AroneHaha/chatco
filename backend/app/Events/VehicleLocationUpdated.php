<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

// LocationService dispatches after commit. Do not make live GPS/capacity
// delivery depend on a queue worker, or fail a saved update on a Pusher outage.
class VehicleLocationUpdated implements ShouldBroadcastNow, ShouldRescue
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $locationData;

    public function __construct(array $locationData)
    {
        $this->locationData = $locationData;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('vehicles');
    }

    public function broadcastAs(): string
    {
        return 'VehicleLocationUpdated';
    }

    public function broadcastWith(): array
    {
        return $this->locationData;
    }
}
