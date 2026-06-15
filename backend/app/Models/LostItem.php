<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LostItem extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'item_name',
        'description',
        'image_url',
        'plate_number',
        'driver_name',
        'conductor_name',
        'vehicle_id',
        'estimated_time_lost',
        'category',
        'reported_by_id',
        'reported_by_role',
        'reporter_name',
        'status',
        'claimed_by',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by_id');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function claims()
    {
        return $this->hasMany(Claim::class, 'item_id');
    }
}