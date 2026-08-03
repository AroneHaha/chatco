<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Sprint 6 (T3) — A commuter's claim on a reported lost item.
 *
 * Created via POST /api/v1/lost-found/{itemId}/claim. A claim is PENDING
 * until an admin reviews it (PATCH /admin/lost-items/{itemId}/claims/{id}/
 * approve|reject). On approval, the parent lost_item is marked RELEASED and
 * released_to is set to the claimant. On rejection, rejection_reason is
 * recorded for the audit trail.
 *
 * Status values: PENDING, APPROVED, REJECTED (enforced in service layer).
 */
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
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Claim $claim) {
            if (empty($claim->id)) {
                $claim->id = (string) Str::uuid();
            }
        });
    }

    public function item()
    {
        return $this->belongsTo(LostItem::class, 'item_id');
    }

    public function claimant()
    {
        return $this->belongsTo(CommuterProfile::class, 'claimant_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function rejectionAudits()
    {
        return $this->hasMany(ClaimRejectionAudit::class, 'claim_id');
    }
}
