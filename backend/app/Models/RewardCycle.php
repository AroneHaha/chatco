<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RewardCycle extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'commuter_id',
        'rides_completed',
        'rides_required',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'rides_completed' => 'integer',
            'rides_required'  => 'integer',
        ];
    }

    public function commuter()
    {
        return $this->belongsTo(User::class, 'commuter_id', 'id');
    }

    public function vouchers()
    {
        return $this->hasMany(Voucher::class, 'reward_cycle_id', 'id');
    }
}