<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * "Fares changed, sign out now" signal for every open conductor app.
 *
 * Dispatched by AdminSettingController after a minimum fare or discount rate
 * change commits. That save also expires every conductor token after a short
 * grace period; this event lets an open app show its notice and sign out
 * within that grace instead of hitting a bare 401.
 *
 * Sends immediately (no queue worker) so it lands inside the grace period.
 * Transport failures are reported without failing the committed save; a
 * device that misses it is signed out when its token expires.
 */
class FaresUpdated implements ShouldBroadcastNow, ShouldRescue
{
    use Dispatchable;

    public function __construct(public int $signOutInSeconds) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('conductors');
    }

    public function broadcastAs(): string
    {
        return 'FaresUpdated';
    }

    public function broadcastWith(): array
    {
        return ['sign_out_in_seconds' => $this->signOutInSeconds];
    }
}
