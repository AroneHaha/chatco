<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class RouteVersion extends Model
{
    use HasFactory;

    public const STATUS_DRAFT = 'DRAFT';

    public const STATUS_PUBLISHED = 'PUBLISHED';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'route_id',
        'version',
        'status',
        'geometry',
        'waypoints',
        'notes',
        'effective_from',
        'effective_until',
        'published_at',
        'created_by',
        'published_by',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'geometry' => 'array',
            'waypoints' => 'array',
            'effective_from' => 'datetime',
            'effective_until' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (RouteVersion $version) {
            if (empty($version->id)) {
                $version->id = (string) Str::uuid();
            }
        });
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function getIsTemporaryAttribute(): bool
    {
        return $this->effective_until !== null;
    }
}
