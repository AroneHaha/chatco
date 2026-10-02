<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** One of up to 3 proof-of-ownership photos attached to a claim. */
class ClaimPhoto extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'claim_id',
        'url',
        'position',
    ];

    protected $casts = [
        'position' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (ClaimPhoto $photo) {
            if (empty($photo->id)) {
                $photo->id = (string) Str::uuid();
            }
        });
    }

    public function claim()
    {
        return $this->belongsTo(Claim::class, 'claim_id');
    }
}
