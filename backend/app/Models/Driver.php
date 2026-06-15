<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Driver extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'first_name',
        'middle_name',
        'surname',
        'suffix',
        'contact_number',
        'address',
        'license_number',
        'license_expiry',
        'hire_date',
        'status',
        'vehicle_id',
    ];

    protected function casts(): array
    {
        return [
            'license_expiry' => 'date',
            'hire_date'      => 'date',
        ];
    }

    public function vehicle()
    {
        return $this->hasOne(Vehicle::class, 'driver_id', 'id');
    }
}