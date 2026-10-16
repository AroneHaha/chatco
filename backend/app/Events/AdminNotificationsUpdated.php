<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class AdminNotificationsUpdated implements ShouldBroadcastNow
{
    use Dispatchable;

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('admin.notifications');
    }

    public function broadcastAs(): string
    {
        return 'AdminNotificationsUpdated';
    }

    // Only an invalidation signal; notification content remains behind the API.
    public function broadcastWith(): array
    {
        return [];
    }
}
