<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Remittance extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';
    protected $primaryKey = 'shift_id';

    protected $fillable = [
        'shift_id',
        'date',
        'conductor_id',
        'conductor_name',
        'driver_id',
        'driver_name',
        'vehicle_id',
        'unit_number',
        'total_passengers',
        'gcash_scanned_total',
        'gcash_direct_total',
        'voucher_total',
        'total_cashless',
        'cash_declared',
        'cash_total',
        'gcash_total',
        'remittance_status',
        'time_in',
        'time_out',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'total_passengers' => 'integer',
            'gcash_scanned_total' => 'decimal:2',
            'gcash_direct_total' => 'decimal:2',
            'voucher_total' => 'decimal:2',
            'total_cashless' => 'decimal:2',
            'cash_declared' => 'decimal:2',
            'cash_total' => 'decimal:2',
            'gcash_total' => 'decimal:2',
            'time_in' => 'datetime',
            'time_out' => 'datetime',
        ];
    }

    public function shiftLog()
    {
        return $this->belongsTo(ShiftLog::class, 'shift_id', 'shift_id');
    }

    public function conductor()
    {
        return $this->belongsTo(ConductorProfile::class, 'conductor_id');
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }
}