<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Driver extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'birthday',
        'contact',
        'license_number',
        'hire_date',
        'profile_picture_url',
        'status',
        'vehicle_id',
        'active_shift_id',
    ];

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
            'hire_date' => 'date',
            'active_shift_id' => 'string',
        ];
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * The currently active shift for this driver.
     * FK active_shift_id → shift_logs.shift_id
     */
    public function activeShift()
    {
        return $this->belongsTo(ShiftLog::class, 'active_shift_id', 'shift_id');
    }

    public function shiftLogs()
    {
        return $this->hasMany(ShiftLog::class);
    }

    public function hasActiveShift(): bool
    {
        return ! is_null($this->active_shift_id);
    }

    public function getActiveShift(): ?ShiftLog
    {
        return $this->activeShift;
    }
}