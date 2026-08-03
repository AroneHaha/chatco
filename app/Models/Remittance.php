<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Remittance extends Model
{
    use HasFactory;

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
        'remittance_status',
        'cash_total',
        'gcash_total',
    ];

    protected function casts(): array
    {
        return [
            'total_collected' => 'decimal:2',
            'remitted_amount' => 'decimal:2',
            'shortage' => 'decimal:2',
            'cash_total' => 'decimal:2',
            'gcash_total' => 'decimal:2',
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