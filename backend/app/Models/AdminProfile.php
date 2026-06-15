<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdminProfile extends Model
{
    use HasFactory, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'first_name',
        'middle_name',
        'last_name',
        'profile_picture_url',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id', 'id');
    }
}