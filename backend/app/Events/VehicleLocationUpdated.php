<?php

namespace App\Events;

use App\Models\VehicleLocation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VehicleLocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $locationData;

    /**
     * Create a new event instance.
     *
     * The payload includes everything a commuter client needs
     * to update the vehicle marker on the map without extra API calls.
     */
    public function __construct(array $locationData)
    {
        $this->locationData = $locationData;
    }

    /**
     * Broadcast on the 'vehicles' channel.
     * All commuters subscribe to this single channel to receive
     * updates for ALL vehicles — no per-vehicle channels needed.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('vehicles'),
        ];
    }

    /**
     * The event name that Laravel Echo listens for.
     */
    public function broadcastAs(): string
    {
        return 'VehicleLocationUpdated';
    }

    /**
     * Only send the data the frontend needs — no internal IDs or secrets.
     */
    public function broadcastWith(): array
    {
        return $this->locationData;
    }
}