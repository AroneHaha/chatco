<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Driver extends Model
{
    use HasFactory, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
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
    ];

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
            'hire_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Driver $driver) {
            if (empty($driver->id)) {
                $driver->id = (string) Str::uuid();
            }
        });
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function shiftLogs()
    {
        return $this->hasMany(ShiftLog::class);
    }
}