<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Setting extends Model
{
    public const RIDES_FOR_FREE_REWARD_KEY = 'rides_for_free_reward';

    public const DEFAULT_RIDES_FOR_FREE_REWARD = 10;

    public const MAX_RIDES_FOR_FREE_REWARD = 100;

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

    /**
     * Return a calculation-safe reward threshold.
     *
     * Admin writes are validated, but this fallback also protects calculations
     * from legacy or manually corrupted setting rows.
     */
    public static function ridesForFreeReward(): int
    {
        $configured = static::where('key', self::RIDES_FOR_FREE_REWARD_KEY)->value('value');
        $validated = filter_var($configured, FILTER_VALIDATE_INT, [
            'options' => [
                'min_range' => 1,
                'max_range' => self::MAX_RIDES_FOR_FREE_REWARD,
            ],
        ]);

        return $validated === false
            ? self::DEFAULT_RIDES_FOR_FREE_REWARD
            : $validated;
    }
}
