<?php

namespace App\Services;

/**
 * PaymentService — PayMongo SANDBOX integration layer.
 *
 * S4-T2 STATUS: STUB. The createGcashIntent() method throws a
 * RuntimeException because the real PayMongo SANDBOX API integration
 * is deferred to a later task (S4-T6 webhook or dedicated PaymentService
 * task). TransactionService::initiateGcashFare() calls this method, so
 * the wiring is correct -- only the PayMongo HTTP call is stubbed.
 *
 * When the real integration lands, replace the throw with:
 *   1. POST to PayMongo /payment_intents with amount + currency + metadata
 *   2. Store the returned PaymentIntent id as paymongo_intent_id
 *   3. Call /payment_intents/{id}/attach to get the hosted checkout URL
 *   4. Return { intent_id, checkout_url } so TransactionService can
 *      persist them on the transaction row
 *
 * Config required (when implemented):
 *   PAYMONGO_SECRET_KEY (env) -- sandbox secret key from PayMongo dashboard
 *   PAYMONGO_PUBLIC_KEY  (env) -- sandbox public key for client-side confirm
 */
class PaymentService
{
    /**
     * Create a PayMongo PaymentIntent for GCash authorize.
     *
     * @param  int    $amountCentavos  Amount in centavos (e.g., 1500 = ₱15.00)
     * @param  array  $meta            Metadata to attach (transaction_id, shift_id, etc.)
     *
     * @return array{ intent_id: string, checkout_url: string }
     *
     * @throws \RuntimeException  Always -- PayMongo integration not yet implemented.
     */
    public function createGcashIntent(int $amountCentavos, array $meta = []): array
    {
        throw new \RuntimeException(
            'PayMongo GCash integration not yet implemented. '
            . 'Wiring is in place (TransactionService::initiateGcashFare calls this); '
            . 'replace this stub with the real PayMongo SANDBOX API call. '
            . 'See class PHPDoc for implementation steps.'
        );
    }
}
