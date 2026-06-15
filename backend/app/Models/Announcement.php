<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

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
    ];

    protected static function booted(): void
    {
        static::creating(function (Announcement $announcement) {
            if (empty($announcement->id)) {
                $announcement->id = (string) Str::uuid();
            }
        });
    }
}