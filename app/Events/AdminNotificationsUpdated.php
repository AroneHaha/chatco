<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * "Admin notifications changed" signal for the bell and open feed.
 *
 * Queued (ShouldBroadcast), like AnnouncementCreated and PaymentStatusUpdated:
 * it was ShouldBroadcastNow, which made every request that notifies admins
 * (e.g. a commuter's discount submission) wait on a live Pusher API call —
 * measured at roughly 85–450 ms locally. It carries no data, and the admin UI
 * still polls every 30 s, so a delayed or dropped signal costs nothing.
 * Needs the queue worker (`php artisan queue:work`), which the other
 * broadcasts already rely on.
 */
class AdminNotificationsUpdated implements ShouldBroadcast
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
