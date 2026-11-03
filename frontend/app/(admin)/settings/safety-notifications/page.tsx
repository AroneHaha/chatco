// app/(admin)/settings/safety-notifications/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Save, AlertCircle, RotateCcw } from 'lucide-react';
import {
  notificationTemplates,
  type NotificationAudience,
  type NotificationTemplateDef,
} from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';

// List + editor: pick a message on the left, edit its text on the right with
// insertable variables and a preview filled with sample data. Only the message
// text is editable; titles and layout stay in code (see MessageTemplates.php).
// The emergency hotline and the unused SOS/receipt templates were removed:
// emergency_hotline keeps its saved value (fallback 911).

type TextMap = Record<string, string>;

const AUDIENCES: NotificationAudience[] = ['Commuter emails', 'Commuter notifications', 'Conductor notifications'];
const byKey = new Map(notificationTemplates.map((template) => [template.key, template]));

function fillSamples(template: NotificationTemplateDef, text: string): string {
  return template.variables.reduce((result, variable) => result.split(`{${variable.name}}`).join(variable.sample), text);
}

/** Braced names in the text the system will not fill in (likely typos). */
function unknownVariables(template: NotificationTemplateDef, text: string): string[] {
  const known = new Set(template.variables.map((variable) => variable.name));
  const found = [...text.matchAll(/\{([A-Za-z_]+)\}/g)].map((match) => match[1]);
  return [...new Set(found)].filter((name) => !known.has(name));
}

export default function SafetyNotificationsPage() {
  const [values, setValues] = useState<TextMap>({});
  const [saved, setSaved] = useState<TextMap>({});
  const [selectedKey, setSelectedKey] = useState(notificationTemplates[0].key);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSettings('safety');
      // A blank saved value means "use the default" on the backend too.
      const loaded = Object.fromEntries(notificationTemplates.map((template) => {
        const stored = data[template.key];
        return [template.key, typeof stored === 'string' && stored.trim() !== '' ? stored : template.defaultText];
      }));
      setValues(loaded);
      setSaved(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const dirtyKeys = useMemo(
    () => notificationTemplates.map((template) => template.key).filter((key) => values[key] !== saved[key]),
    [values, saved],
  );

  const selected = byKey.get(selectedKey)!;
  const text = values[selectedKey] ?? '';
  const unknown = unknownVariables(selected, text);

  const setText = (next: string) => {
    setValues((prev) => ({ ...prev, [selectedKey]: next }));
    setJustSaved(false);
  };

  const insertVariable = (name: string) => {
    const field = textareaRef.current;
    const token = `{${name}}`;
    const start = field?.selectionStart ?? text.length;
    const end = field?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + token + text.slice(end));
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  // Only changed templates are sent. allSettled keeps the ones that did save
  // marked as saved when another request fails.
  const handleSave = async () => {
    if (dirtyKeys.length === 0) return;
    setIsSaving(true);
    setError(null);
    const results = await Promise.allSettled(
      dirtyKeys.map((key) => updateSetting(key, values[key].trim() === '' ? '' : values[key], 'safety').then(() => key)),
    );
    const savedKeys = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const restored = Object.fromEntries(savedKeys.map((key) => [key, values[key].trim() === '' ? byKey.get(key)!.defaultText : values[key]]));
    setValues((prev) => ({ ...prev, ...restored }));
    setSaved((prev) => ({ ...prev, ...restored }));
    const failed = results.length - savedKeys.length;
    if (failed > 0) {
      setError(`${failed} template${failed === 1 ? '' : 's'} could not be saved. Your edits are kept; try saving again.`);
    } else {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    }
    setIsSaving(false);
  };

  // Static placeholders (no pulsing, per the UI rules).
  if (isLoading) {
    return (
      <div aria-busy="true" className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:flex lg:h-full lg:flex-col lg:pb-6">
        <span role="status" className="sr-only">Loading notification settings</span>
        <div className="mb-6 h-7 w-48 shrink-0 rounded bg-[#1A2540] admin-light:bg-slate-200" />
        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_minmax(0,1fr)] [&>div]:lg:h-auto">
          <div className="h-80 rounded-lg border border-[#1E2D45] bg-[#131C2E] admin-light:border-[#E2E8F0] admin-light:bg-white" />
          <div className="h-[28rem] rounded-lg border border-[#1E2D45] bg-[#131C2E] admin-light:border-[#E2E8F0] admin-light:bg-white" />
        </div>
      </div>
    );
  }

  const status = isSaving
    ? 'Saving…'
    : dirtyKeys.length > 0
      ? `${dirtyKeys.length} unsaved change${dirtyKeys.length === 1 ? '' : 's'}`
      : justSaved ? 'All changes saved' : 'No unsaved changes';

  return (
    // From lg the page fills the drawer's content area: both panels run to its
    // bottom and scroll inside, and the message box takes the spare height.
    <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:flex lg:h-full lg:flex-col lg:pb-6">
      <div className="mb-5 flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white admin-light:text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400 admin-light:text-slate-500">The wording of messages CHATCO sends automatically.</p>
        </div>
        <div className="flex items-center gap-3">
          <span aria-live="polite" className="text-xs text-slate-400 admin-light:text-slate-500">{status}</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || dirtyKeys.length === 0}
            className="flex items-center gap-2 rounded-md bg-[#1A5FB4] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#164A8F] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#1A2540] disabled:text-slate-500 admin-light:disabled:bg-slate-200 admin-light:disabled:text-slate-400"
          >
            <Save size={16} aria-hidden="true" /> Save changes
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-red-500/50 bg-[#131C2E] p-3 admin-light:border-red-300 admin-light:bg-white">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400 admin-light:text-red-600" aria-hidden="true" />
          <p className="text-sm text-red-400 admin-light:text-red-600">{error}</p>
        </div>
      )}

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Template picker: a grouped select on small screens, a list from lg. */}
        <label className="lg:hidden">
          <span className="mb-1.5 block text-xs font-medium text-slate-400 admin-light:text-slate-600">Message</span>
          <select
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="w-full rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] admin-light:border-[#E2E8F0] admin-light:bg-white admin-light:text-slate-900 admin-light:focus:ring-[#1A5FB4]"
          >
            {AUDIENCES.map((audience) => (
              <optgroup key={audience} label={audience}>
                {notificationTemplates.filter((template) => template.audience === audience).map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.title}{dirtyKeys.includes(template.key) ? ' (edited)' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <nav aria-label="Notification templates" className="hidden rounded-lg border border-[#1E2D45] bg-[#131C2E] p-2 admin-light:border-[#E2E8F0] admin-light:bg-white lg:block lg:min-h-0 lg:overflow-y-auto">
          {AUDIENCES.map((audience) => (
            <div key={audience} className="mb-2 last:mb-0">
              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{audience}</p>
              <ul>
                {notificationTemplates.filter((template) => template.audience === audience).map((template) => {
                  const active = template.key === selectedKey;
                  const edited = dirtyKeys.includes(template.key);
                  return (
                    <li key={template.key}>
                      <button
                        type="button"
                        onClick={() => setSelectedKey(template.key)}
                        aria-current={active ? 'true' : undefined}
                        className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                          active
                            ? 'bg-[#1A5FB4] font-medium text-white'
                            : 'text-slate-300 hover:bg-[#1A2540] admin-light:text-slate-700 admin-light:hover:bg-[#F1F5F9]'
                        }`}
                      >
                        <span className="min-w-0 leading-snug">{template.title}</span>
                        {edited && <span className={`shrink-0 text-[10px] ${active ? 'text-white/80' : 'text-slate-500'}`}>Edited</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Editor */}
        <section aria-labelledby="template-title" className="min-w-0 rounded-lg border border-[#1E2D45] bg-[#131C2E] p-4 admin-light:border-[#E2E8F0] admin-light:bg-white sm:p-5 lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{selected.audience}</p>
              <h2 id="template-title" className="mt-1 text-lg font-semibold text-white admin-light:text-slate-900">{selected.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setText(selected.defaultText)}
              disabled={text === selected.defaultText}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#2A3A55] bg-[#1A2540] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-[#22304D] disabled:cursor-not-allowed disabled:opacity-50 admin-light:border-[#E2E8F0] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-[#F1F5F9]"
            >
              <RotateCcw size={14} aria-hidden="true" /> Reset to default
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-400 admin-light:text-slate-500">{selected.sentWhen}</p>
          {selected.note && <p className="mt-2 text-xs leading-relaxed text-slate-500">{selected.note}</p>}

          <label htmlFor="template-text" className="mt-5 block text-xs font-medium text-slate-300 admin-light:text-slate-700">Message text</label>
          <textarea
            id="template-text"
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            className="mt-1.5 w-full resize-y rounded-md lg:min-h-36 lg:flex-1 border border-[#1E2D45] bg-[#0E1628] p-3 text-sm leading-relaxed text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] admin-light:border-[#E2E8F0] admin-light:bg-[#F8FAFC] admin-light:text-slate-900 admin-light:focus:ring-[#1A5FB4]"
          />
          {text.trim() === '' && (
            <p className="mt-1.5 text-xs text-slate-400 admin-light:text-slate-500">Left empty, the default wording is sent.</p>
          )}

          <div className="mt-3">
            <p className="text-xs font-medium text-slate-300 admin-light:text-slate-700">Insert a variable</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {selected.variables.map((variable) => (
                <button
                  key={variable.name}
                  type="button"
                  onClick={() => insertVariable(variable.name)}
                  title={`Example: ${variable.sample}`}
                  className="rounded-md border border-[#2A3A55] bg-[#1A2540] px-2 py-1 font-mono text-xs text-slate-200 transition-colors hover:bg-[#22304D] admin-light:border-[#E2E8F0] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-[#F1F5F9]"
                >
                  {`{${variable.name}}`}
                </button>
              ))}
            </div>
            {unknown.length > 0 && (
              <p className="mt-2 text-xs text-red-400 admin-light:text-red-600">
                Not a variable for this message, so it is sent as typed: {unknown.map((name) => `{${name}}`).join(', ')}
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-[#1E2D45] pt-4 admin-light:border-[#E2E8F0]">
            <p className="text-xs font-medium text-slate-300 admin-light:text-slate-700">Preview with sample data</p>
            <p className="mt-2 whitespace-pre-wrap rounded-md border border-[#1E2D45] bg-[#0E1628] p-3 text-sm leading-relaxed text-slate-200 admin-light:border-[#E2E8F0] admin-light:bg-[#F8FAFC] admin-light:text-slate-700">
              {fillSamples(selected, text.trim() === '' ? selected.defaultText : text)}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
