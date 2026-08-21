<?php

namespace App\Events;

use App\Models\Announcement;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched when an admin publishes a new ACTIVE, broadcast-to-everyone
 * announcement (user_id is null — a targeted, single-recipient announcement
 * never fires this).
 *
 * Broadcasts on the public 'announcements' channel so every signed-in
 * commuter's "Latest Updates" feed + unread badge update immediately instead
 * of waiting for the next poll tick (see AnnouncementsProvider on the
 * frontend).
 *
 * Triggered by: AnnouncementService::create() after the row commits.
 */
class AnnouncementCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Announcement $announcement;

    public function __construct(Announcement $announcement)
    {
        $this->announcement = $announcement;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('announcements');
    }

    public function broadcastAs(): string
    {
        return 'AnnouncementCreated';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->announcement->id,
            'type' => $this->announcement->type,
            'title' => $this->announcement->title,
            'message' => $this->announcement->message,
            'status' => $this->announcement->status,
            'created_at' => $this->announcement->created_at->toIso8601String(),
        ];
    }
}
