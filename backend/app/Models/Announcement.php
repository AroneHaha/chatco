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
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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

    public function reads()
    {
        return $this->hasMany(AnnouncementRead::class, 'announcement_id');
    }
}
