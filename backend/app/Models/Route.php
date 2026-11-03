<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
        'geometry',
    ];

    protected function casts(): array
    {
        return [
            // Editor control points, [[lat, lng], ...].
            'waypoints' => 'array',
            // The live road line, [[lat, lng], ...]. One line, no history.
            'geometry' => 'array',
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

    /** Whether a road line has been saved (maps and hail coverage need one). */
    public function hasGeometry(): bool
    {
        return count($this->geometry ?? []) >= 2;
    }
}
