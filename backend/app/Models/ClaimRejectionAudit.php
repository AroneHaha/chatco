<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ClaimRejectionAudit extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'claim_id',
        'item_id',
        'claimant_id',
        'rejected_by',
        'previous_status',
        'resulting_status',
        'rejection_reason',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $audit): void {
            if (empty($audit->id)) {
                $audit->id = (string) Str::uuid();
            }
        });
    }

    public function claim()
    {
        return $this->belongsTo(Claim::class, 'claim_id');
    }

    public function claimant()
    {
        return $this->belongsTo(CommuterProfile::class, 'claimant_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }
}
