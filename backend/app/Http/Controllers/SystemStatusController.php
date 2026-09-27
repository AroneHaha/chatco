<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

/**
 * Public system-status endpoint.
 *
 * Exposes the maintenance flag (and its message) so PUBLIC surfaces — the
 * marketing landing page in particular — can show a "we're down for
 * maintenance" screen. Admins toggle this at /settings/app-configuration,
 * which writes the `maintenance_mode` / `maintenance_message` settings
 * (category = app). No auth: the landing page is public.
 */
class SystemStatusController extends Controller
{
    use ApiResponse;

    private const DEFAULT_MESSAGE = "CHATCO is currently undergoing scheduled maintenance. We'll be back online shortly — thank you for your patience!";

    public function index(): JsonResponse
    {
        $settings = Setting::query()
            ->whereIn('key', ['maintenance_mode', 'maintenance_message', Setting::REQUIRE_ID_UPLOAD_KEY])
            ->pluck('value', 'key');

        $message = $settings['maintenance_message'] ?? null;

        return $this->successResponse([
            'maintenance_mode' => ($settings['maintenance_mode'] ?? 'false') === 'true',
            'maintenance_message' => ($message !== null && trim($message) !== '')
                ? $message
                : self::DEFAULT_MESSAGE,
            // Read by the public signup form so a REGULAR commuter's ID
            // upload is only marked required when the admin requires it.
            'require_id_upload' => ($settings[Setting::REQUIRE_ID_UPLOAD_KEY] ?? 'true') === 'true',
        ], 'System status retrieved');
    }
}
