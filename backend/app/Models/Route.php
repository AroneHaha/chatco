<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Route extends Model
{
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'status',
        'waypoints',
    ];

    protected function casts(): array
    {
        return [
            'waypoints' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Route $route) {
            if (empty($route->id)) {
                $route->id = (string) Str::uuid();
            }
        });
    }

    public function vehicles()
    {
        return $this->hasMany(Vehicle::class);
    }

    public function farePoints()
    {
        return $this->hasMany(FarePoint::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(RouteVersion::class)->orderByDesc('version');
    }
}
