<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Sprint 6 (T4) — Per-user announcement read record.
 *
 * Composite PK (announcement_id, user_id) — one row per user per
 * announcement. Created via POST /announcements/{id}/read (idempotent
 * upsert). Powers the is_read flag on the feed + the unread-count bell.
 */
class AnnouncementRead extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    public $timestamps = false;

    protected $primaryKey = ['announcement_id', 'user_id'];

    protected $fillable = [
        'announcement_id',
        'user_id',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function announcement()
    {
        return $this->belongsTo(Announcement::class, 'announcement_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
