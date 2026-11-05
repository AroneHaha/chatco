<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Broadcasting\ShouldRescue;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * "Fares changed" signal: open conductor apps sign out, open commuter fare
 * calculators reload the matrix.
 *
 * Dispatched by App\Support\ConductorSignOut after a Financial Rules change or
 * a Fare Matrix place change commits. That save also expires every conductor
 * token after a short grace period; this event lets an open app show its notice and sign out
 * within that grace instead of hitting a bare 401. Commuters stay signed in and
 * only refetch the public fare matrix (the public `fares` channel carries no
 * private data).
 *
 * Sends immediately (no queue worker) so it lands inside the grace period.
 * Transport failures are reported without failing the committed save; a
 * device that misses it is signed out when its token expires, and a commuter
 * calculator gets the new fares the next time it opens.
 */
class FaresUpdated implements ShouldBroadcastNow, ShouldRescue
{
    use Dispatchable;

    public function __construct(public int $signOutInSeconds) {}

    /** @return array<int, Channel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('conductors'), new Channel('fares')];
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
