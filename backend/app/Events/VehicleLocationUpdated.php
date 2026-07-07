<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VehicleLocationUpdated implements ShouldBroadcast
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