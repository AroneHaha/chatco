<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Setting extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'key',
        'value',
        'category',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'updated_by' => 'string',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Setting $setting) {
            if (empty($setting->id)) {
                $setting->id = (string) Str::uuid();
            }
        });
    }
}
