<?php

namespace App\Models;

use App\Enums\HailStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Hail extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'id';

    protected $fillable = [
        'commuter_id',
        'vehicle_id',
        'conductor_id',
        'commuter_lat',
        'commuter_lng',
        'distance_m',
        'status',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => HailStatus::class,
            'commuter_lat' => 'decimal:7',
            'commuter_lng' => 'decimal:7',
            'distance_m' => 'decimal:2',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * Auto-generate UUID on creation.
     */
    protected static function booted(): void
    {
        static::creating(function (Hail $hail) {
            if (empty($hail->id)) {
                $hail->id = (string) Str::uuid();
            }
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function commuter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'commuter_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function conductor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'conductor_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Query Scopes
    |--------------------------------------------------------------------------
    */

    public function scopePending(Builder $query): void
    {
        $query->where('status', HailStatus::PENDING);
    }

    public function scopeForVehicle(Builder $query, string $vehicleId): void
    {
        $query->where('vehicle_id', $vehicleId);
    }

    public function scopeExpired(Builder $query): void
    {
        $query->where('status', HailStatus::PENDING)
            ->where('expires_at', '<', now());
    }
}
