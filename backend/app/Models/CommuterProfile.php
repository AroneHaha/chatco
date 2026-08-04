<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CommuterProfile extends Model
{
    use HasFactory, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'first_name',
        'middle_name',
        'surname',
        'birthdate',
        'gender',
        'email',
        'contact_number',
        'commuter_type',
        'applied_type',
        'username',
        'language_preference',
        'account_status',
        'id_image_url',
        'verified_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
            'verified_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id', 'id');
    }

    public function latestLocation()
    {
        return $this->hasOne(CommuterLocation::class, 'commuter_id');
    }
}
