<?php

namespace Tests\Feature;

use Illuminate\Http\Request;
use Tests\TestCase;

class MobileRouteContractTest extends TestCase
{
    public function test_shared_operations_have_mobile_entry_points_and_keep_web_handlers(): void
    {
        $pairs = [
            ['GET', 'user', 'mobile/user', 'user'],
            ['POST', 'auth/login', 'mobile/auth/login', 'login'],
            ['POST', 'auth/logout', 'mobile/auth/logout', 'logout'],
            ['POST', 'auth/register', 'mobile/auth/register', 'register'],
            ['POST', 'auth/register/send-code', 'mobile/auth/register/send-code', 'sendRegistrationCode'],
            ['POST', 'auth/register/verify-code', 'mobile/auth/register/verify-code', 'verifyRegistrationCode'],
            ['POST', 'auth/forgot-password', 'mobile/auth/forgot-password', 'forgotPassword'],
            ['POST', 'auth/verify-reset-code', 'mobile/auth/verify-reset-code', 'verifyResetCode'],
            ['POST', 'auth/reset-password', 'mobile/auth/reset-password', 'resetPassword'],
            ['GET', 'fare-matrix', 'mobile/fare-matrix', 'index'],
            ['GET', 'routes/active', 'mobile/routes/active', 'active'],
            ['GET', 'system-status', 'mobile/system-status', 'index'],
            ['GET', 'payments/ticket/status', 'mobile/payments/ticket/status', 'status'],
            ['POST', 'payments/ticket/cancel', 'mobile/payments/ticket/cancel', 'cancel'],
            ['POST', 'payments/ticket/simulate', 'mobile/payments/ticket/simulate', 'simulate'],
            ['GET', 'conductor/shift', 'mobile/conductor/shift', 'shiftStatus'],
            ['POST', 'conductor/shifts/start', 'mobile/conductor/shifts/start', 'startShift'],
            ['GET', 'commuter/profile', 'mobile/commuter/profile', 'profile'],
            ['GET', 'commuter/rewards', 'mobile/commuter/rewards', 'rewards'],
            ['POST', 'commuter/payments/claim', 'mobile/commuter/payments/claim', 'claim'],
            ['POST', 'commuter/payments/ticket/redeem-voucher', 'mobile/commuter/payments/ticket/redeem-voucher', 'redeemVoucher'],
            ['POST', 'commuter/receipts/claim', 'mobile/commuter/receipts/claim', 'claimReceipt'],
            ['GET', 'announcements', 'mobile/conductor/announcements', 'index'],
            ['POST', 'announcements/notice/read', 'mobile/conductor/announcements/notice/read', 'markRead'],
            ['GET', 'announcements', 'mobile/commuter/announcements', 'index'],
            ['POST', 'qr/scan', 'mobile/commuter/qr/scan', 'scan'],
        ];

        foreach ($pairs as [$method, $web, $mobile, $action]) {
            $webRoute = app('router')->getRoutes()->match(Request::create('/api/v1/'.$web, $method));
            $mobileRoute = app('router')->getRoutes()->match(Request::create('/api/v1/'.$mobile, $method));
            $this->assertSame($action, $webRoute->getActionMethod(), $web);
            $this->assertSame($action, $mobileRoute->getActionMethod(), $mobile);
            $this->assertContains('api', $mobileRoute->gatherMiddleware());
        }
    }

    public function test_mobile_sensitive_routes_retain_authentication_and_role_checks(): void
    {
        foreach ([
            ['GET', 'mobile/conductor/shift', 'CONDUCTOR'],
            ['POST', 'mobile/conductor/transactions/sync', 'CONDUCTOR'],
            ['GET', 'mobile/commuter/hails/active', 'COMMUTER'],
            ['GET', 'mobile/commuter/hail/request', 'COMMUTER'],
            ['GET', 'mobile/payments/ticket/status', 'CONDUCTOR,COMMUTER'],
        ] as [$method, $path, $role]) {
            $route = app('router')->getRoutes()->match(Request::create('/api/v1/'.$path, $method));
            $this->assertContains('auth:sanctum', $route->gatherMiddleware());
            $this->assertContains('role:'.$role, $route->gatherMiddleware());
        }
    }
}
