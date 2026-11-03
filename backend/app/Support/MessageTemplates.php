<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Admin-editable wording for system notifications (Settings > Notifications).
 *
 * Only the message text is editable; titles, layout and delivery stay in code.
 * Each key lives in the settings table (category "safety", with the
 * registration emails). A missing or blank value falls back to DEFAULTS, so
 * nothing changes until an admin edits a template, and clearing one restores
 * the default instead of sending an empty message.
 *
 * Keep DEFAULTS in sync with notificationTemplates in the frontend's
 * app/(admin)/settings/data/settings-data.ts.
 */
final class MessageTemplates
{
    public const DEFAULTS = [
        'discount_approved_template' => 'Your {discount_type} discount application is approved. Your commuter classification has been updated.',
        'discount_correction_template' => 'Your discount application needs a correction. Submit corrected supporting documents from your Discount Application page. Your account remains Regular until it is approved. {reason}',
        'discount_rejected_template' => 'Your discount application was not approved. Your account remains Regular. {reason}',
        'renewal_reminder_template' => 'Renew your student status {period}. Submit a school ID showing the current school year or valid enrollment proof. Your discount continues throughout the renewal period. Without a submission by {deadline}, your commuter type becomes Regular. Open Student Renewal to submit proof or choose No Longer a Student.',
        'renewal_approved_template' => 'Your student status has been renewed. Your student discount is available.',
        'renewal_correction_template' => 'Please submit corrected enrollment proof within seven days. {reason}',
        'renewal_rejected_template' => 'Your student renewal was not approved. Your commuter type is now Regular. {reason}',
        'renewal_expired_template' => 'Your student renewal deadline has passed. Your account remains available as a Regular commuter. Submit current enrollment proof to apply again.',
        'remittance_reminder_template' => 'Shift {shift_id} still has PHP {amount} in expected cash awaiting remittance.',
        'onsite_account_template' => 'Hi {name}, an admin created your commuter account at a CHATCO terminal. Sign in with the default password below.',
    ];

    /**
     * The saved template for $key, or its default. Call once before a loop:
     * each call is one settings query.
     */
    public static function get(string $key): string
    {
        $saved = Setting::where('key', $key)->value('value');

        return is_string($saved) && trim($saved) !== '' ? $saved : self::DEFAULTS[$key];
    }

    /**
     * Fill {placeholders} in $template. Unknown placeholders are left as typed.
     *
     * @param  array<string, string|int|float|null>  $vars  Names without braces.
     */
    public static function render(string $template, array $vars): string
    {
        $pairs = [];
        foreach ($vars as $name => $value) {
            $pairs['{'.$name.'}'] = (string) $value;
        }

        // trim: an empty optional value (e.g. no {reason}) must not leave a trailing space.
        return trim(strtr($template, $pairs));
    }
}
