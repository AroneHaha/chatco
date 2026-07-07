<?php

namespace App\Services;

use App\Support\Qr\QrTokenException;
use Illuminate\Support\Carbon;

/**
 * Stateless HMAC-signed QR token service for the S6 feedback unit-QR flow.
 *
 * Token format:  base64url(JSON payload) + '.' + hex(HMAC-SHA256)
 *
 * The payload contains:
 *   - v:           version (1)
 *   - vehicle_id:  the jeepney unit this QR belongs to
 *   - issued_at:   ISO-8601 timestamp
 *   - expires_at:  ISO-8601 timestamp (issued_at + TTL)
 *
 * Tamper-resistance: any change to the payload breaks the HMAC comparison
 * (hash_equals, constant-time). Expiry is checked AFTER signature verification
 * so an attacker cannot shorten/extend the TTL by editing the payload.
 *
 * No DB row is created at issue time — the token is fully self-contained.
 * Revocation is via TTL expiry (rotate the secret to invalidate all tokens).
 */
class QrTokenService
{
    public function __construct(
        private readonly string $secret,
        private readonly int $ttlMinutes,
    ) {}

    /**
     * Resolve the service from config. Used by the service container
     * (registered in AppServiceProvider) so controllers get a DI'd instance.
     */
    public static function fromConfig(): self
    {
        $secret = (string) config('qr.feedback_secret');

        // Dev fallback: derive from APP_KEY so the flow works out of the box.
        // Production should set QR_FEEDBACK_SECRET explicitly.
        if ($secret === '') {
            $secret = (string) config('app.key');
        }

        return new self(
            $secret,
            (int) config('qr.feedback_ttl_minutes', 10080),
        );
    }

    /**
     * Issue a signed token for a vehicle.
     *
     * @return array{token: string, payload: array<string, mixed>, signature: string, expires_at: string}
     */
    public function issue(string $vehicleId): array
    {
        $issuedAt = Carbon::now();
        $expiresAt = $issuedAt->copy()->addMinutes($this->ttlMinutes);

        $payload = [
            'v' => 1,
            'vehicle_id' => $vehicleId,
            'issued_at' => $issuedAt->toIso8601String(),
            'expires_at' => $expiresAt->toIso8601String(),
        ];

        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $signature = hash_hmac('sha256', $json, $this->secret);
        $b64 = $this->base64UrlEncode($json);

        return [
            'token' => $b64 . '.' . $signature,
            'payload' => $payload,
            'signature' => $signature,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    /**
     * Verify a token's signature + expiry and return the decoded payload.
     *
     * @return array<string, mixed>
     * @throws QrTokenException  If malformed, bad signature, or expired.
     */
    public function verify(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 2) {
            throw new QrTokenException('Malformed token');
        }

        [$b64, $signature] = $parts;
        $json = $this->base64UrlDecode($b64);
        if ($json === null) {
            throw new QrTokenException('Malformed payload');
        }

        $expected = hash_hmac('sha256', $json, $this->secret);
        if (! hash_equals($expected, $signature)) {
            throw new QrTokenException('Invalid signature');
        }

        $payload = json_decode($json, true);
        if (! is_array($payload) || ! isset($payload['vehicle_id'], $payload['expires_at'])) {
            throw new QrTokenException('Invalid payload');
        }

        $expiresAt = Carbon::parse($payload['expires_at']);
        if (Carbon::now()->greaterThanOrEqualTo($expiresAt)) {
            throw new QrTokenException('Token expired');
        }

        return $payload;
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $data): ?string
    {
        $padded = strtr($data, '-_', '+/');
        $decoded = base64_decode($padded, true);
        return $decoded === false ? null : $decoded;
    }
}
