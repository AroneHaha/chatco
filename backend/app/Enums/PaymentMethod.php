<?php

namespace App\Enums;

/**
 * How a fare was paid.
 *
 * - CASH:  collected by the conductor, recorded immediately as PAID, and
 *          physically remitted at end of shift.
 * - GCASH: settled through a payment gateway (PayMongo). Starts PENDING and
 *          is confirmed asynchronously via webhook. Record-only at remittance
 *          (the money lands in the gateway account, not the conductor's cash).
 *
 * Kept deliberately small + provider-neutral: the *gateway* (not the method)
 * identifies which provider settled a GCASH payment, so adding e.g. MAYA
 * later does not require a new payment method.
 */
enum PaymentMethod: string
{
    case CASH = 'CASH';
    case GCASH = 'GCASH';

    /**
     * Whether this method settles through an external payment gateway
     * (and therefore goes through the PENDING → PAID async lifecycle).
     */
    public function isGatewaySettled(): bool
    {
        return $this === self::GCASH;
    }

    /**
     * Whether this method is physically remitted by the conductor.
     */
    public function isRemittable(): bool
    {
        return $this === self::CASH;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $c) => $c->value, self::cases());
    }
}
