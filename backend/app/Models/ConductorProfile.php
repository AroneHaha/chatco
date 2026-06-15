<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class ConductorProfile extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'first_name',
        'middle_name',
        'last_name',
        'birthday',
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
}