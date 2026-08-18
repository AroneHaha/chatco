<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ConductorProfile extends Model
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
        'profile_picture_url',
        'generated_username',
        'generated_password',
    ];

    protected function casts(): array
    {
        return [
            'birthday' => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id', 'id');
    }

    public function vehicle()
    {
        return $this->hasOne(Vehicle::class, 'conductor_id');
    }

    public function shiftLogs()
    {
        return $this->hasMany(ShiftLog::class, 'conductor_id');
    }
}