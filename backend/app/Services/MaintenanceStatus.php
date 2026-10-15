<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Setting;

class MaintenanceStatus
{
    public const ROLES = ['COMMUTER', 'CONDUCTOR'];

    public const DEFAULT_MESSAGE = "CHATCO is currently undergoing scheduled maintenance. We'll be back online shortly — thank you for your patience!";

    /** @return array{maintenance_mode: bool, maintenance_roles: array, maintenance_message: string} */
    public function current(): array
    {
        $settings = Setting::query()
            ->whereIn('key', ['maintenance_mode', 'maintenance_roles', 'maintenance_message'])
            ->pluck('value', 'key');
        $roles = json_decode($settings['maintenance_roles'] ?? 'null', true);
        $message = trim($settings['maintenance_message'] ?? '');

        return [
            'maintenance_mode' => ($settings['maintenance_mode'] ?? 'false') === 'true',
            // Existing installations applied maintenance to both roles.
            'maintenance_roles' => is_array($roles)
                ? array_values(array_filter(self::ROLES, fn ($role) => in_array($role, $roles, true)))
                : self::ROLES,
            'maintenance_message' => $message !== '' ? $message : self::DEFAULT_MESSAGE,
        ];
    }

    public function messageFor(?UserRole $role): ?string
    {
        if (! $role || $role === UserRole::ADMIN) {
            return null;
        }

        $status = $this->current();

        return $status['maintenance_mode'] && in_array($role->value, $status['maintenance_roles'], true)
            ? $status['maintenance_message']
            : null;
    }
}
