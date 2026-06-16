<?php

namespace App\Models;

use App\Enums\ShiftStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShiftLog extends Model
{
    use HasFactory;

    /**
     * The actual DB uses shift_id (varchar 20) as PK.
     * Denormalized columns (conductor_name, driver_name, plate_number)
     * exist for read performance — they are NOT FKs.
     */
    protected $primaryKey = 'shift_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'shift_id',
        'conductor_id',
        'driver_id',
        'vehicle_id',
        'route_id',
        'time_in',
        'time_out',
        'status',
        'conductor_name',
        'driver_name',
        'plate_number',
        'total_trips',
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
        return $this->belongsTo(Driver::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function route()
    {
        return $this->belongsTo(Route::class);
    }

    public function remittance()
    {
        return $this->hasOne(Remittance::class, 'shift_id', 'shift_id');
    }

    public function isActive(): bool
    {
        return $this->status === ShiftStatus::ACTIVE;
    }

    public function isEnded(): bool
    {
        return $this->status === ShiftStatus::ENDED;
    }

    public function scopeActive($query)
    {
        return $query->where('status', ShiftStatus::ACTIVE->value);
    }

    public function scopeEnded($query)
    {
        return $query->where('status', ShiftStatus::ENDED->value);
    }

    public function scopeByConductor($query, string $conductorId)
    {
        return $query->where('conductor_id', $conductorId);
    }

    public function scopeByDriver($query, string $driverId)
    {
        return $query->where('driver_id', $driverId);
    }
}