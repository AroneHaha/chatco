<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Remittance extends Model
{
    use HasFactory;

    protected $primaryKey = 'shift_id';

    public $incrementing = false;

    protected $keyType = 'string';

    public const STATUS_PENDING = 'PENDING';

    public const STATUS_COMPLETE = 'COMPLETE';

    public const STATUS_SHORTAGE = 'SHORTAGE';

    public const STATUS_OVERAGE = 'OVERAGE';

    protected $fillable = [
        'shift_id',
        'conductor_id',
        'driver_id',
        'vehicle_id',
        'date',
        'conductor_name',
        'driver_name',
        'unit_number',
        'total_passengers',
        'time_in',
        'time_out',
        'total_collected',
        'remitted_amount',
        'shortage',
        'overage',
        'remittance_status',
        'cash_total',
        'gcash_total',
        'remittance_due_at',
        'last_reminder_at',
        'reminder_count',
        'remitted_at',
    ];

    protected function casts(): array
    {
        return [
            'total_collected' => 'decimal:2',
            'remitted_amount' => 'decimal:2',
            'shortage' => 'decimal:2',
            'overage' => 'decimal:2',
            'cash_total' => 'decimal:2',
            'gcash_total' => 'decimal:2',
            'remittance_due_at' => 'datetime',
            'last_reminder_at' => 'datetime',
            'reminder_count' => 'integer',
            'remitted_at' => 'datetime',
        ];
    }

    public function shift()
    {
        return $this->belongsTo(ShiftLog::class, 'shift_id', 'shift_id');
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

    public function hasShortage(): bool
    {
        return $this->shortage > 0;
    }
}
