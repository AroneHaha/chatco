<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FarePoint extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'route_id',
        'point_number',
        'code',
        'name',
        'landmarks',
        'sub_stops',
        'regular_fare',
        'discounted_fare',
        'latitude',
        'longitude',
    ];

    protected function casts(): array
    {
        return [
            'point_number' => 'integer',
            'regular_fare' => 'decimal:2',
            'discounted_fare' => 'decimal:2',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (FarePoint $farePoint) {
            if (empty($farePoint->id)) {
                $farePoint->id = (string) Str::uuid();
            }
        });
    }

    public function route()
    {
        return $this->belongsTo(Route::class);
    }
}