<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class UserSuspension extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'reason_code',
        'reason',
        'starts_at',
        'ends_at',
        'is_permanent',
        'suspended_by',
        'lifted_at',
        'lifted_by',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'lifted_at' => 'datetime',
            'is_permanent' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $suspension): void {
            if (! $suspension->id) {
                $suspension->id = (string) Str::uuid();
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
