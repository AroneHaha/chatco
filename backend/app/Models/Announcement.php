<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'title',
        'content',
        'target_audience',
        'is_active',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active'    => 'boolean',
            'published_at' => 'datetime',
        ];
    }
}