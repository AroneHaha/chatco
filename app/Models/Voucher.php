<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Voucher extends Model
{
    use HasFactory, SoftDeletes;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'code',
        'commuter_id',
        'type',
        'status',
        'amount',
        'expires_at',
        'ride_origin',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expires_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Voucher $voucher) {
            if (empty($voucher->id)) {
                $voucher->id = (string) Str::uuid();
            }
        });
    }

    public function commuter()
    {
        return $this->belongsTo(CommuterProfile::class);
    }
}