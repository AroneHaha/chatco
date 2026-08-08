<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Voucher extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_AVAILABLE = 'AVAILABLE';

    public const STATUS_EXPIRED = 'EXPIRED';

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
        'reward_cycle_number',
        'reward_rule_version',
        'reward_earned_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expires_at' => 'datetime',
            'reward_cycle_number' => 'integer',
            'reward_rule_version' => 'integer',
            'reward_earned_at' => 'datetime',
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

    /**
     * Normalize only this commuter's overdue, still-available vouchers.
     *
     * The WHERE clauses keep this as a targeted bulk update; valid, used, and
     * already-expired vouchers are never rewritten on each rewards request.
     */
    public static function expireAvailableForCommuter(string $commuterId): int
    {
        return static::where('commuter_id', $commuterId)
            ->where('status', self::STATUS_AVAILABLE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->update(['status' => self::STATUS_EXPIRED]);
    }

    /**
     * Recover earned reward-cycle rows that were soft-deleted.
     *
     * The unique reward-cycle key still reserves a soft-deleted row. Restoring
     * that original voucher preserves its code, status, expiry, and idempotency
     * identity instead of attempting to insert a conflicting replacement.
     */
    public static function restoreDeletedRewardCyclesForCommuter(string $commuterId): int
    {
        return static::onlyTrashed()
            ->where('commuter_id', $commuterId)
            ->where('type', 'REWARD')
            ->whereNotNull('reward_cycle_number')
            ->restore();
    }
}
