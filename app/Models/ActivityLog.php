<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ActivityLog extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'category',
        'description',
        'actor_id',
        'actor_name',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $log): void {
            if (empty($log->id)) {
                $log->id = (string) Str::uuid();
            }
        });
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
