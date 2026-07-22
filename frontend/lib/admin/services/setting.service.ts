// lib/admin/services/setting.service.ts
//
// Generic key-value settings service for admin config pages.
//
//   GET /api/admin/settings?category=financial   → getSettings(category)
//   PUT /api/admin/settings/{key}                 → updateSetting(key, value, category)

export type SettingCategory = "financial" | "operations" | "safety" | "app" | "receipt" | "general";

/** A key-value map of settings (e.g. { regular_discount: "0", student_discount: "20" }) */
export type SettingsMap = Record<string, string>;

export class SettingError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SettingError";
    this.status = status;
  }
}

/**
 * Fetch all settings in a category as a key-value map.
 */
export async function getSettings(category: SettingCategory): Promise<SettingsMap> {
  const res = await fetch(`/api/admin/settings?category=${encodeURIComponent(category)}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new SettingError(
      body?.message ?? `Failed to fetch settings (HTTP ${res.status})`,
      res.status
    );
  }

  const json = await res.json();
  // Backend returns { data: { key: value, ... } } (plucked)
  return (json.data ?? {}) as SettingsMap;
}

/**
 * Create or update a single setting by key.
 */
export async function updateSetting(
  key: string,
  value: string,
  category: SettingCategory
): Promise<void> {
  const res = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ value, category }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new SettingError(
      body?.message ?? `Failed to update setting (HTTP ${res.status})`,
      res.status
    );
  }
}
