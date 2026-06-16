<?php

namespace App\Models;

use App\Enums\ShiftStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShiftLog extends Model
{
    use HasFactory;

    protected $primaryKey = 'shift_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'shift_id',
        'conductor_id',
        'driver_id',
        'vehicle_id',
        'route_id',
        'conductor_name',
        'driver_name',
        'plate_number',
        'time_in',
        'time_out',
        'total_trips',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'time_in' => 'datetime',
            'time_out' => 'datetime',
            'total_trips' => 'integer',
            'status' => ShiftStatus::class,
        ];
    }

    public function conductor()
    {
        return $this->belongsTo(User::class, 'conductor_id');
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class, 'driver_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function route()
    {
        return $this->belongsTo(Route::class, 'route_id');
    }

    public function remittance()
    {
        return $this->hasOne(Remittance::class, 'shift_id', 'shift_id');
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('status', ShiftStatus::ACTIVE);
    }

    public function scopeEnded(Builder $query): void
    {
        $query->where('status', ShiftStatus::ENDED);
    }

    public function scopeByConductor(Builder $query, string $conductorId): void
    {
        $query->where('conductor_id', $conductorId);
    }

    public function scopeByDriver(Builder $query, string $driverId): void
    {
        $query->where('driver_id', $driverId);
    }

    public function isActive(): bool
    {
        return $this->status === ShiftStatus::ACTIVE;
    }

    public function isEnded(): bool
    {
        return $this->status === ShiftStatus::ENDED;
    }
}