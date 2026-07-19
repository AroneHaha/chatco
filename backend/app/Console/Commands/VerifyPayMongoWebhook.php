<?php

namespace App\Console\Commands;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\PaymentEvent;
use App\Models\Transaction;
use App\Services\PaymentService;
use App\Support\Payments\PaymentGatewayException;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Artisan command: php artisan payments:verify-webhook
 *
 * Diagnostic for the PayMongo GCash flow. Prints a one-shot report covering:
 *   - which gateway is bound + whether it's configured
 *   - PayMongo secret key prefix (sk_test_ vs sk_live_) + mask
 *   - webhook secret configured (yes/no) + mask
 *   - return_url, claim TTL, reconcile throttle, late-settlement grace
 *   - simulation enabled flag
 *   - recent payment_events (webhook audit log) with provider/status counts
 *   - recent GCash transactions grouped by status
 *   - live provider reachability test (retrieveStatus on a recent PENDING
 *     or EXPIRED row, if any exists with a payment_reference)
 *
 * Exit codes:
 *   0 = everything healthy (or no real gateway configured, which is fine in dev)
 *   1 = at least one check failed (missing config, no recent webhooks,
 *       provider unreachable)
 *
 * Run this:
 *   - after first configuring PayMongo keys, to confirm the binding
 *   - when webhook deliveries seem missing (commuter pays on PayMongo but
 *     the transaction stays PENDING in CHATCO)
 *   - before production cutover, as a pre-flight check
 */
class VerifyPayMongoWebhook extends Command
{
    protected $signature = 'payments:verify-webhook
                            {--test-retrieve : Attempt a live retrieveStatus call against the most recent PENDING/EXPIRED GCash transaction}';

    protected $description = 'Diagnose the PayMongo GCash webhook + reconciliation setup (config, recent events, provider reachability)';

    public function handle(PaymentService $paymentService): int
    {
        $this->info('CHATCO — PayMongo GCash diagnostic');
        $this->newLine();

        $failures = 0;

        // ─── 1. Gateway binding ─────────────────────────────────────────
        $gatewayName = $paymentService->gatewayName();
        $configured = $paymentService->isGatewayConfigured();
        $this->line("Gateway bound:     <fg=cyan>{$gatewayName}</>");
        $this->line("Configured:        ".($configured ? '<fg=green>yes</>' : '<fg=red>no</>'));
        if ($gatewayName === 'fake') {
            $this->line('  <fg=yellow>→ FakeGateway is active. Set PAYMONGO_SECRET_KEY + PAYMONGO_WEBHOOK_SECRET in .env to switch.</>');
        }
        $this->newLine();

        // ─── 2. PayMongo key + webhook secret ───────────────────────────
        $secretKey = (string) config('payments.gateways.paymongo.secret', '');
        $webhookSecret = (string) config('payments.gateways.paymongo.webhook_secret', '');

        $keyMasked = $secretKey !== ''
            ? $this->maskKey($secretKey).' ('.($this->isSandboxKey($secretKey) ? 'SANDBOX' : 'LIVE').')'
            : '<fg=red>(not set)</>';
        $webhookMasked = $webhookSecret !== ''
            ? $this->maskKey($webhookSecret)
            : '<fg=red>(not set)</>';

        $this->line("PAYMONGO_SECRET_KEY:      {$keyMasked}");
        $this->line("PAYMONGO_WEBHOOK_SECRET:  {$webhookMasked}");
        if ($secretKey === '' || $webhookSecret === '') {
            $failures++;
            $this->line('  <fg=red>✗ PayMongo credentials incomplete — webhook signature verification will fail.</>');
            $this->line('  <fg=yellow>  Get them from https://dashboard.paymongo.com/developers/api-keys + Webhooks.</>');
        } else {
            $this->line('  <fg=green>✓ Both keys set.</>');
        }
        $this->newLine();

        // ─── 3. Other config ────────────────────────────────────────────
        $this->line('Config:');
        $this->line('  default gateway:        <fg=cyan>'.(string) config('payments.default', 'paymongo').'</>');
        $this->line('  return_url:             <fg=cyan>'.(string) config('payments.return_url', '(unset)').'</>');
        $this->line('  gcash_claim_ttl_minutes: <fg=cyan>'.(string) config('payments.gcash_claim_ttl_minutes', 10).'</> min');
        $this->line('  reconcile_throttle:     <fg=cyan>'.(string) config('payments.reconcile_throttle_seconds', 30).'</> s');
        $this->line('  late_settlement_grace:  <fg=cyan>'.(string) config('payments.late_settlement_grace_seconds', 60).'</> s');
        $this->line('  allow_simulation:       <fg=cyan>'.(config('payments.allow_simulation') ? 'true (DEV)' : 'false').'</>');
        $this->newLine();

        // ─── 4. Webhook URL hint ────────────────────────────────────────
        // Detect whether the backend is exposed via a public domain (production)
        // or via localhost (local dev). The hint text adapts accordingly.
        $appUrl = rtrim((string) config('app.url'), '/');
        $webhookUrl = $appUrl.'/api/v1/payments/webhook';
        $isLocalUrl = $this->isLocalUrl($appUrl);

        $this->line('Webhook URL to register in PayMongo dashboard:');
        $this->line("  <fg=cyan>{$webhookUrl}</>");
        $this->line('  <fg=yellow>→ PayMongo dashboard → Developers → Webhooks → Create webhook.</>');
        if ($isLocalUrl) {
            $this->line('  <fg=yellow>→ Local dev: PayMongo cannot reach localhost. Use ngrok (or a similar</>');
            $this->line('  <fg=yellow>  tunnel) to expose port 8000, then register the tunnel URL in PayMongo.</>');
        } else {
            $this->line('  <fg=yellow>→ Production: APP_URL points at your public domain — PayMongo can reach</>');
            $this->line('  <fg=yellow>  this URL directly. No tunnel needed.</>');
        }
        $this->newLine();

        // ─── 5. Recent payment_events (webhook audit) ───────────────────
        $recentEvents = PaymentEvent::query()
            ->latest('id')
            ->limit(10)
            ->get(['id', 'provider', 'event_id', 'transaction_id', 'type', 'status', 'created_at']);

        $this->line('Recent payment_events (last 10):');
        if ($recentEvents->isEmpty()) {
            $this->line('  <fg=yellow>⚠ No webhook events recorded yet.</>');
            $this->line('  <fg=yellow>  Either no payments have been attempted, or the webhook is not reaching the backend.</>');
            if ($gatewayName !== 'fake' && $configured) {
                $failures++;
            }
        } else {
            $this->table(
                ['ID', 'Provider', 'Type', 'Status', 'Transaction', 'When'],
                $recentEvents->map(fn ($e) => [
                    $e->id,
                    $e->provider,
                    $e->type,
                    $e->status,
                    $e->transaction_id ?? '—',
                    $e->created_at?->diffForHumans() ?? '—',
                ])->all()
            );
        }
        $this->newLine();

        // Aggregate by provider+status for a quick health signal.
        $byProviderStatus = PaymentEvent::query()
            ->select('provider', 'status', DB::raw('COUNT(*) as cnt'))
            ->groupBy('provider', 'status')
            ->orderByDesc('cnt')
            ->limit(20)
            ->get();
        if ($byProviderStatus->isNotEmpty()) {
            $this->line('Event counts by provider/status:');
            $this->table(
                ['Provider', 'Status', 'Count'],
                $byProviderStatus->map(fn ($r) => [
                    $r->provider,
                    is_string($r->status) ? $r->status : (string) $r->status,
                    $r->cnt,
                ])->all()
            );
            $this->newLine();
        }

        // ─── 5b. Webhook delivery health check ──────────────────────────
        // Distinguish REAL webhook events (type from PayMongo, e.g.
        // 'payment.paid') from SIMULATED events (type starts with 'simulated.').
        // If the gateway is real but only simulated events exist, PayMongo
        // webhooks are NOT reaching the backend. The fix depends on whether
        // the backend is exposed via a public domain (production) or via
        // localhost (local dev — needs a tunnel like ngrok).
        if ($gatewayName !== 'fake' && $configured) {
            $realEventCount = PaymentEvent::query()
                ->where('provider', $gatewayName)
                ->where('type', 'not like', 'simulated.%')
                ->count();
            $simulatedEventCount = PaymentEvent::query()
                ->where('provider', $gatewayName)
                ->where('type', 'like', 'simulated.%')
                ->count();

            $this->line('Webhook delivery health:');
            $this->line("  Real webhook events received:    <fg=cyan>{$realEventCount}</>");
            $this->line("  Simulated events (dev button):   <fg=cyan>{$simulatedEventCount}</>");

            if ($realEventCount === 0) {
                $failures++;
                $this->line('  <fg=red>✗ Zero real PayMongo webhook events recorded.</>');

                if ($isLocalUrl) {
                    // Local dev guidance — ngrok required
                    $this->line('  <fg=yellow>  PayMongo cannot reach http://localhost:8000 — localhost URLs are not</>');
                    $this->line('  <fg=yellow>  publicly routable. To test the real flow locally:</>');
                    $this->line('  <fg=yellow>    1. Expose the backend with ngrok:    ngrok http 8000</>');
                    $this->line('  <fg=yellow>    2. Copy the ngrok HTTPS URL (e.g. https://abcd-203-0-113-1.ngrok-free.app)</>');
                    $this->line('  <fg=yellow>    3. Register it in PayMongo dashboard → Developers → Webhooks:</>');
                    $this->line('  <fg=yellow>       URL: https://<ngrok-url>/api/v1/payments/webhook</>');
                    $this->line('  <fg=yellow>    4. Copy the webhook signing secret PayMongo shows + put it in .env:</>');
                    $this->line('  <fg=yellow>       PAYMONGO_WEBHOOK_SECRET=whsk_<the-secret-paymongo-generated></>');
                    $this->line('  <fg=yellow>    5. Run: php artisan config:clear && php artisan optimize:clear</>');
                } else {
                    // Production guidance — domain should be reachable directly
                    $this->line("  <fg=yellow>  Your backend is on a public domain ({$appUrl}) — PayMongo should be</>");
                    $this->line('  <fg=yellow>  able to reach it. Check the following:</>');
                    $this->line('  <fg=yellow>    1. Confirm the webhook URL is registered in PayMongo dashboard:</>');
                    $this->line("  <fg=yellow>       {$webhookUrl}</>");
                    $this->line('  <fg=yellow>    2. Confirm PAYMONGO_WEBHOOK_SECRET in .env matches the secret PayMongo</>');
                    $this->line('  <fg=yellow>       shows for that webhook (signature verification fails otherwise).</>');
                    $this->line('  <fg=yellow>    3. Check backend/storage/logs/laravel.log for "invalid signature" or</>');
                    $this->line('  <fg=yellow>       "no matching transaction" warnings — they pinpoint the failure.</>');
                    $this->line('  <fg=yellow>    4. Try sending a test event from the PayMongo dashboard "Send Test" button.</>');
                }

                $this->line('  <fg=yellow>  Note: even WITHOUT a webhook, the provider-reconciliation logic in</>');
                $this->line('  <fg=yellow>  PaymentController::status() will retrieve the PaymentIntent from</>');
                $this->line('  <fg=yellow>  PayMongo directly every 30s when a poller hits the status endpoint.</>');
                $this->line('  <fg=yellow>  So GCash payments should now settle within ~30s of the commuter</>');
                $this->line('  <fg=yellow>  authorizing, even if the webhook is missing.</>');
            } else {
                $this->line('  <fg=green>✓ Real PayMongo webhooks are being received.</>');
            }
            $this->newLine();
        }

        // ─── 6. Recent GCash transactions by status ────────────────────
        $gcashByStatus = Transaction::query()
            ->where('payment_method', PaymentMethod::GCASH)
            ->select('status', DB::raw('COUNT(*) as cnt'), DB::raw('MAX(created_at) as last_seen'))
            ->groupBy('status')
            ->get();

        $this->line('GCash transactions by status:');
        if ($gcashByStatus->isEmpty()) {
            $this->line('  <fg=yellow>⚠ No GCash transactions in the DB yet.</>');
        } else {
            // Helper: Transaction.status is cast to PaymentStatus enum, so we
            // need ->value to get the underlying string. Handled via a helper
            // because the same code path also runs against un-casted columns.
            $statusStr = function ($s): string {
                if (is_string($s)) return $s;
                if ($s instanceof \BackedEnum) return $s->value;
                if ($s instanceof \UnitEnum) return $s->name;
                return (string) $s;
            };

            $this->table(
                ['Status', 'Count', 'Last seen'],
                $gcashByStatus->map(fn ($r) => [
                    $statusStr($r->status),
                    $r->cnt,
                    $r->last_seen ?? '—',
                ])->all()
            );
            // Diagnostic flag: lots of EXPIRED + few PAID suggests webhook issues.
            $expired = 0;
            $paid = 0;
            foreach ($gcashByStatus as $r) {
                $statusVal = $statusStr($r->status);
                if ($statusVal === 'EXPIRED') $expired = (int) $r->cnt;
                if ($statusVal === 'PAID') $paid = (int) $r->cnt;
            }
            if ($expired >= 3 && $paid === 0 && $gatewayName !== 'fake') {
                $failures++;
                $this->line('  <fg=red>✗ Multiple EXPIRED GCash rows but zero PAID — webhook likely not reaching the backend.</>');
            }
        }
        $this->newLine();

        // ─── 7. Live provider reachability test (opt-in) ───────────────
        if ($this->option('test-retrieve') || $this->confirm('Attempt a live retrieveStatus call against a recent GCash transaction?', false)) {
            $failures += $this->runProviderReachabilityTest($paymentService);
        } elseif ($gatewayName !== 'fake' && $configured) {
            $this->line('Live provider reachability test: <fg=yellow>skipped (pass --test-retrieve to enable)</>');
            $this->newLine();
        }

        // ─── Summary ────────────────────────────────────────────────────
        if ($failures > 0) {
            $this->line("<fg=red>✗ {$failures} check(s) failed. See above.</>");
            return self::FAILURE;
        }

        $this->line('<fg=green>✓ All checks passed.</>');
        return self::SUCCESS;
    }

    /**
     * Live provider reachability test: pick the most recent PENDING or
     * EXPIRED GCash transaction with a payment_reference and call
     * retrieveStatus against it. This proves:
     *   - the secret key is valid (PayMongo returns 200, not 401),
     *   - the gateway code path is wired correctly,
     *   - the provider API is reachable from this host.
     */
    private function runProviderReachabilityTest(PaymentService $paymentService): int
    {
        if (! $paymentService->isGatewayConfigured()) {
            $this->line('Live provider reachability test: <fg=yellow>skipped (gateway not configured)</>');
            $this->newLine();
            return 0;
        }

        $transaction = Transaction::query()
            ->where('payment_method', PaymentMethod::GCASH)
            ->whereIn('status', [PaymentStatus::PENDING, PaymentStatus::EXPIRED, PaymentStatus::PAID])
            ->whereNotNull('payment_reference')
            ->where('payment_reference', 'not like', 'fake\_%')
            ->latest('created_at')
            ->first();

        if (! $transaction) {
            $this->line('Live provider reachability test: <fg=yellow>skipped (no GCash transaction with a real payment_reference found)</>');
            $this->newLine();
            return 0;
        }

        $this->line("Live provider reachability test (transaction: {$transaction->transaction_id}, ref: {$transaction->payment_reference}):");

        try {
            $providerStatus = $paymentService->syncStatus($transaction);
            $this->line("  <fg=green>✓ PayMongo API reachable. Provider status mapped to: {$providerStatus->status->value}</>");
            $failures = 0;
        } catch (PaymentGatewayException $e) {
            $this->line("  <fg=red>✗ PayMongo API call failed: {$e->getMessage()}</>");
            $this->line('  <fg=yellow>  Common causes: invalid secret key (401), wrong base_url, network egress blocked.</>');
            $failures = 1;
        }

        $this->newLine();
        return $failures;
    }

    private function maskKey(string $key): string
    {
        $len = strlen($key);
        if ($len <= 8) {
            return str_repeat('*', $len);
        }
        return substr($key, 0, 4).'…'.substr($key, -4)." ({$len} chars)";
    }

    private function isSandboxKey(string $key): bool
    {
        return str_starts_with($key, 'sk_test_');
    }

    /**
     * Whether the given APP_URL is a local-only URL (not publicly routable).
     * Used to tailor the diagnostic guidance: local URLs need ngrok (or a
     * similar tunnel) for PayMongo to reach them; public URLs (e.g.
     * https://api.chatco.online) work directly.
     */
    private function isLocalUrl(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST) ?: '';
        if ($host === '') return true;

        // Common local dev hosts. .test is Laravel Valet, .local is Homestead
        // / custom, .nip.io / .sslip.io are wildcard DNS used for local testing.
        $localPatterns = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',
            '::1',
        ];
        if (in_array($host, $localPatterns, true)) return true;

        $localSuffixes = ['.test', '.local', '.nip.io', '.sslip.io'];
        foreach ($localSuffixes as $suffix) {
            if (str_ends_with($host, $suffix)) return true;
        }

        return false;
    }
}
