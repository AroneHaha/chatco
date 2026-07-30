<?php

namespace App\Providers;

use App\Contracts\Payments\PaymentGateway;
use App\Services\Payments\Gateways\FakeGateway;
use App\Services\Payments\Gateways\PayMongoGateway;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;

/**
 * Binds the provider-agnostic PaymentGateway contract to a concrete gateway
 * selected by config (payments.default). If the selected gateway is not
 * configured (no keys yet), it transparently falls back to FakeGateway so
 * the payment lifecycle remains usable without credentials.
 *
 * To add a provider: implement PaymentGateway, add a case in makeGateway(),
 * and a config entry. Nothing else in the app changes.
 */
class PaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PaymentGateway::class, function () {
            $name = (string) config('payments.default', 'paymongo');
            $gateway = $this->makeGateway($name);

            return $gateway->isConfigured() ? $gateway : new FakeGateway();
        });
    }

    private function makeGateway(string $name): PaymentGateway
    {
        return match ($name) {
            'paymongo' => new PayMongoGateway(
                secretKey: config('payments.gateways.paymongo.secret'),
                webhookSecret: config('payments.gateways.paymongo.webhook_secret'),
                baseUrl: (string) config('payments.gateways.paymongo.base_url', 'https://api.paymongo.com/v1'),
                timeoutSeconds: (int) config('payments.gateways.paymongo.timeout', 30),
                retryTimes: (int) config('payments.gateways.paymongo.retry_times', 2),
                retrySleepMs: (int) config('payments.gateways.paymongo.retry_sleep_ms', 250),
            ),
            'fake' => new FakeGateway(),
            default => throw new InvalidArgumentException("Unknown payment gateway [{$name}]."),
        };
    }
}
