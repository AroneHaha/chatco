<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FaqItem extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'question', 'answer', 'category', 'display_order', 'is_active'];

    /**
     * The category slugs the landing-page FAQ chat knows how to render
     * (each maps to a label + emoji in the frontend). Kept here as the
     * server-side source of truth for validation.
     */
    public const CATEGORIES = [
        'getting-started',
        'payments',
        'riding',
        'safety',
        'rewards',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}
