<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * The Next.js server relays every browser request, so Laravel's socket peer is
 * the same for all users. ResolveProxiedClientIp restores the real IP — but only
 * for requests carrying the shared secret — so `throttle:auth` (10/min per IP)
 * counts individual users instead of one shared bucket.
 */
class ProxiedClientIpTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'test-proxy-secret-value';

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        config(['services.frontend_proxy.secret' => self::SECRET]);
    }

    /** Wrong-password login: counts against the auth limiter, returns 401. */
    private function attemptLogin(array $headers = []): int
    {
        return $this->withHeaders($headers)
            ->postJson('/api/v1/auth/login', [
                'login' => 'nobody@example.com',
                'password' => 'wrong-password',
            ])
            ->getStatusCode();
    }

    private function proxied(string $ip, string $secret = self::SECRET): array
    {
        return [
            'X-Chatco-Client-IP' => $ip,
            'X-Chatco-Proxy-Secret' => $secret,
        ];
    }

    public function test_users_behind_the_proxy_get_separate_auth_buckets(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->assertSame(401, $this->attemptLogin($this->proxied('203.0.113.10')));
        }

        // User A is now limited...
        $this->assertSame(429, $this->attemptLogin($this->proxied('203.0.113.10')));

        // ...but user B, behind the same Next.js host, is not.
        $this->assertSame(401, $this->attemptLogin($this->proxied('203.0.113.20')));
    }

    public function test_forwarded_ip_is_ignored_without_the_correct_secret(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->attemptLogin($this->proxied('203.0.113.10', 'wrong-secret'));
        }

        // A direct caller cannot pick a fresh IP to dodge the limiter: every
        // request still counts against the real socket address.
        $this->assertSame(429, $this->attemptLogin($this->proxied('203.0.113.99', 'wrong-secret')));
        $this->assertSame(429, $this->attemptLogin(['X-Chatco-Client-IP' => '203.0.113.98']));
    }

    public function test_forwarded_ip_is_ignored_when_no_secret_is_configured(): void
    {
        config(['services.frontend_proxy.secret' => null]);

        for ($i = 0; $i < 10; $i++) {
            $this->attemptLogin($this->proxied('203.0.113.10', ''));
        }

        $this->assertSame(429, $this->attemptLogin($this->proxied('203.0.113.20', '')));
    }

    public function test_malformed_forwarded_ip_is_ignored(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->attemptLogin($this->proxied('not-an-ip'));
        }

        $this->assertSame(429, $this->attemptLogin($this->proxied('also not an ip')));
    }

    public function test_ip_resolves_to_the_forwarded_address_when_secret_matches(): void
    {
        $request = \Illuminate\Http\Request::create('/api/v1/auth/login', 'POST', server: ['REMOTE_ADDR' => '10.0.0.5']);
        $request->headers->set('X-Chatco-Client-IP', '203.0.113.77');
        $request->headers->set('X-Chatco-Proxy-Secret', self::SECRET);

        $seen = null;
        (new \App\Http\Middleware\ResolveProxiedClientIp)->handle($request, function ($req) use (&$seen) {
            $seen = $req->ip();

            return response('ok');
        });

        $this->assertSame('203.0.113.77', $seen);
    }

    public function test_sanctum_does_not_write_last_used_at_by_default(): void
    {
        $user = User::create([
            'email' => 'admin@gmail.com',
            'password' => Hash::make('password123'),
            'role' => UserRole::ADMIN,
        ]);
        \App\Models\AdminProfile::create([
            'id' => $user->id,
            'first_name' => 'System',
            'last_name' => 'Admin',
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/user')->assertOk();

        $this->assertNull($user->tokens()->first()->last_used_at);
    }
}
