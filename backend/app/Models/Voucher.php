<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'code',
        'type',
        'status',
        'discount_percentage',
        'reward_cycle_id',
        'commuter_id',
        'expires_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'discount_percentage' => 'decimal:2',
            'expires_at'          => 'datetime',
            'used_at'             => 'datetime',
        ];
    }

    public function rewardCycle()
    {
        return $this->belongsTo(RewardCycle::class, 'reward_cycle_id', 'id');
    }

    public function commuter()
    {
        return $this->belongsTo(User::class, 'commuter_id', 'id');
    }
}