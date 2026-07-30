<?php

namespace App\Enums;

/**
 * Lifecycle status of a transaction's payment.
 *
 * Provider-agnostic: every payment gateway (PayMongo today, others later)
 * maps its own provider statuses onto these canonical values inside its
 * Gateway implementation — the rest of the app only ever sees these.
 *
 * State machine (see canTransitionTo / TRANSITIONS):
 *
 *   PENDING ──▶ PROCESSING ──▶ PAID ──▶ REFUNDED
 *      │            │            ▲
 *      │            ├──▶ FAILED  │
 *      ├──▶ FAILED  ├──▶ CANCELLED
 *      ├──▶ CANCELLED
 *      └──▶ EXPIRED ─────────────┘
 *
 * Terminal states (no further transitions except PAID→REFUNDED) prevent an
 * out-of-order or replayed webhook from regressing a settled payment.
 *
 * EXPIRED → PAID is deliberately allowed: the app expires a QR lazily after
 * its claim TTL, but a commuter who claimed just before the cutoff may still
 * complete the provider checkout moments later. If the provider webhook says
 * money moved, the fare MUST be recorded — the provider is the source of
 * truth for settlement.
 */
enum PaymentStatus: string
{
    case PENDING = 'PENDING';
    case PROCESSING = 'PROCESSING';
    case PAID = 'PAID';
    case FAILED = 'FAILED';
    case CANCELLED = 'CANCELLED';
    case EXPIRED = 'EXPIRED';
    case REFUNDED = 'REFUNDED';

    /**
     * Allowed forward transitions. A status not listed as a value for a key
     * cannot be reached from that key. PAID is terminal except for REFUNDED.
     *
     * @return array<string, list<self>>
     */
    private const TRANSITIONS = [
        'PENDING'    => [self::PROCESSING, self::PAID, self::FAILED, self::CANCELLED, self::EXPIRED],
        'PROCESSING' => [self::PAID, self::FAILED, self::CANCELLED, self::EXPIRED],
        'PAID'       => [self::REFUNDED],
        'FAILED'     => [],
        'CANCELLED'  => [],
        // A late provider webhook can still settle an app-expired payment —
        // the commuter may have completed checkout right after the local TTL.
        'EXPIRED'    => [self::PAID],
        'REFUNDED'   => [],
    ];

    /**
     * Whether a transition from $this to $target is allowed. Re-applying the
     * same status is always allowed (idempotent webhook retries).
     */
    public function canTransitionTo(self $target): bool
    {
        if ($this === $target) {
            return true;
        }

        return in_array($target, self::TRANSITIONS[$this->value], true);
    }

    /**
     * A status that can no longer change (except the explicit PAID→REFUNDED).
     */
    public function isTerminal(): bool
    {
        return match ($this) {
            self::FAILED, self::CANCELLED, self::EXPIRED, self::REFUNDED => true,
            self::PAID => true, // settled; only an explicit refund moves it
            default => false,
        };
    }

    /**
     * Counts toward realised earnings.
     */
    public function isPaid(): bool
    {
        return $this === self::PAID;
    }

    /**
     * Still awaiting a final outcome (safe to keep polling / await webhook).
     */
    public function isPending(): bool
    {
        return $this === self::PENDING || $this === self::PROCESSING;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $c) => $c->value, self::cases());
    }
}
