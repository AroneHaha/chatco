<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Claim extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'item_id',
        'claimant_name',
        'claimant_contact',
        'claimant_email',
        'claim_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'claim_date' => 'datetime',
        ];
    }

    public function lostItem()
    {
        return $this->belongsTo(LostItem::class, 'item_id', 'id');
    }
}