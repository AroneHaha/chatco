<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LostItem extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'item_name',
        'description',
        'image_url',
        'plate_number',
        'driver_name',
        'conductor_name',
        'estimated_time_lost',
        'category',
        'date_posted',
        'reporter_name',
        'status',
        'claimed_by',
    ];

    protected function casts(): array
    {
        return [
            'date_posted' => 'datetime',
        ];
    }

    public function claims()
    {
        return $this->hasMany(Claim::class, 'item_id', 'id');
    }
}