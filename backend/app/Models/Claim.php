<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Claim extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'item_id',
        'claimant_id',
        'claimant_name',
        'claimant_contact',
        'claimant_email',
        'status',
        'proof',
    ];

    protected function casts(): array
    {
        return [
            'item_id' => 'string',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Claim $claim) {
            if (empty($claim->id)) {
                $claim->id = (string) Str::uuid();
            }
        });
    }

    public function lostItem()
    {
        return $this->belongsTo(LostItem::class, 'item_id');
    }

    public function claimant()
    {
        return $this->belongsTo(CommuterProfile::class, 'claimant_id');
    }
}