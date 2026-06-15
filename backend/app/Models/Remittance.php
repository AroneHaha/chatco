<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Remittance extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'shift_log_id',
        'conductor_id',
        'cash_total',
        'gcash_total',
        'total_cashless',
        'cash_declared',
        'total_passengers',
        'remittance_status',
        'remittance_option',
        'remitted_at',
    ];

    protected function casts(): array
    {
        return [
            'cash_total'        => 'decimal:2',
            'gcash_total'       => 'decimal:2',
            'total_cashless'    => 'decimal:2',
            'cash_declared'     => 'decimal:2',
            'remitted_at'       => 'datetime',
        ];
    }

    public function shiftLog()
    {
        return $this->belongsTo(ShiftLog::class, 'shift_log_id', 'id');
    }

    public function conductor()
    {
        return $this->belongsTo(ConductorProfile::class, 'conductor_id', 'id');
    }
}