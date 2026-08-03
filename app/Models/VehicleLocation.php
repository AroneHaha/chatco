<?php

namespace App\Models;

use App\Enums\CapacityStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VehicleLocation extends Model
{
    use HasFactory;

    protected $table = 'vehicle_locations';

    protected $primaryKey = 'vehicle_id';

    public $incrementing = false;

    protected $keyType = 'string';

    const CREATED_AT = null;

    protected $fillable = [
        'vehicle_id',
        'conductor_id',
        'lat',
        'lng',
        'speed',
        'heading',
        'capacity_status',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'speed' => 'decimal:2',
            'heading' => 'decimal:2',
            'capacity_status' => CapacityStatus::class,
            'updated_at' => 'datetime',
        ];
    }

    public static function upsertPosition(
        string $vehicleId,
        string $lat,
        string $lng,
        ?string $conductorId = null,
        ?string $speed = null,
        ?string $heading = null,
        ?CapacityStatus $capacityStatus = null,
    ): self {
        return static::updateOrCreate(
            ['vehicle_id' => $vehicleId],
            [
                'conductor_id' => $conductorId,
                'lat' => $lat,
                'lng' => $lng,
                'speed' => $speed,
                'heading' => $heading,
                'capacity_status' => $capacityStatus?->value ?? CapacityStatus::AVAILABLE->value,
            ],
        );
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function conductor()
    {
        return $this->belongsTo(User::class, 'conductor_id');
    }
}