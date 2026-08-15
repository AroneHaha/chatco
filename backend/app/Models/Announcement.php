<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Sprint 6 (T4) — Admin-published system announcement.
 *
 * Created by admins (POST /admin/announcements), visible to all authenticated
 * users (GET /announcements), per-user read tracking via AnnouncementRead.
 * Soft-archiving (status=ARCHIVED) hides from the feed without losing the
 * audit trail.
 *
 * `user_id` (nullable) targets a single recipient — null means broadcast to
 * everyone (the original behaviour); a set user_id is only visible to that
 * user. System-generated rows (e.g. LostItemService claim-status updates)
 * always target a specific user; admin-authored ones are always broadcasts.
 */
class Announcement extends Model
{
    use HasFactory, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'type',
        'title',
        'message',
        'created_by',
        'status',
        'user_id',
        'archived_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'archived_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Announcement $announcement) {
            if (empty($announcement->id)) {
                $announcement->id = (string) Str::uuid();
            }
        });
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Null for broadcast announcements; set for a targeted, single-user one. */
    public function recipient()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reads()
    {
        return $this->hasMany(AnnouncementRead::class, 'announcement_id');
    }
}
