#!/usr/bin/env python3
"""
Workaround for ClickUp v2 dependency endpoint returning ACCESS_083.

The native dependency endpoint (POST /task/{id}/dependency) returns
"You do not have access to this task" even for tasks created by the same
personal API token. This is a known ClickUp API quirk.

Fallback strategy: prepend a prominent "Dependencies" header at the very top
of each downstream task's description, listing the upstream tasks it depends on
(by id + title + ClickUp URL). This makes the dependency chain impossible to
miss when the team opens the task, and ClickUp renders markdown headers
prominently in the description panel.

This script is idempotent — if the header already exists, it's replaced rather
than duplicated.
"""

import json
import re
import time
import urllib.request
import urllib.error

TOKEN = 'pk_312703695_K4M6P3NRSH0OPZ3SAPAQT1EZ713MV7LE'
MANIFEST = '/home/z/my-project/upload/clickup/s6_created_manifest.json'
HEADERS = {
    'Authorization': TOKEN,
    'Content-Type': 'application/json',
}

DEPENDENCIES = {
    'S6-T6':  ['S6-T1'],
    'S6-T7':  ['S6-T2'],
    'S6-T8':  ['S6-T3'],
    'S6-T9':  ['S6-T4'],
    'S6-T10': ['S6-T5'],
    'S6-T11': ['S6-T1', 'S6-T2', 'S6-T3', 'S6-T4', 'S6-T5'],
    'S6-T12': ['S6-T1', 'S6-T2', 'S6-T3', 'S6-T4', 'S6-T5'],
}

DEPENDENCY_HEADER_RE = re.compile(
    r'## 🔗 Dependencies[\s\S]*?(?=\n## |\n---|\Z)',
    re.MULTILINE,
)


def api_call(method, url, payload=None, retries=4):
    data = None
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read().decode('utf-8')
                if not body:
                    return {}
                return json.loads(body)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', errors='replace')
            if e.code in (429, 500, 502, 503, 504) and attempt < retries:
                wait = 2 ** attempt
                print(f'    [retry {attempt}/{retries}] {e.code} — waiting {wait}s')
                time.sleep(wait)
                last_err = (e.code, err_body)
                continue
            raise RuntimeError(f'HTTP {e.code} on {method} {url}: {err_body}') from e
        except urllib.error.URLError as e:
            if attempt < retries:
                wait = 2 ** attempt
                time.sleep(wait)
                last_err = str(e)
                continue
            raise
    raise RuntimeError(f'Exhausted retries for {method} {url}: {last_err}')


def fetch_task(task_id):
    return api_call('GET', f'https://api.clickup.com/api/v2/task/{task_id}')


def update_task(task_id, description):
    payload = {'description': description}
    return api_call('PUT', f'https://api.clickup.com/api/v2/task/{task_id}', payload=payload)


def build_dependency_header(upstream_ids, manifest):
    """Build a markdown 'Dependencies' header listing upstream tasks."""
    lines = ['## 🔗 Dependencies (set these in ClickUp Dependencies panel)', '']
    lines.append('This task **cannot be started until** the following upstream tasks are complete:')
    lines.append('')
    for uid in upstream_ids:
        info = manifest[uid]
        lines.append(f'- **{uid}** — {info["name"].split(" - ", 1)[1]}  ')
        lines.append(f'  - ClickUp: {info["url"]}')
        lines.append(f'  - Layer: `{info["layer"]}`')
    lines.append('')
    lines.append('> ⚠️ Native ClickUp dependency edges could not be set via API (ACCESS_083). ')
    lines.append('> Please wire them in the ClickUp UI: open this task → click the dependency ')
    lines.append('> icon in the top-right → add the upstream task IDs listed above.')
    lines.append('')
    return '\n'.join(lines)


def main():
    with open(MANIFEST, 'r') as f:
        manifest = json.load(f)

    print('Prepending Dependencies header to each downstream task description')
    print('=' * 72)
    for downstream_id, upstreams in DEPENDENCIES.items():
        info = manifest[downstream_id]
        task_id = info['id']
        print(f'\n→ {downstream_id} depends on {", ".join(upstreams)}')
        print(f'  task_id={task_id}  name={info["name"]}')

        # Fetch current description
        task = fetch_task(task_id)
        current_desc = task.get('description', '') or ''
        # Strip any pre-existing Dependencies header (idempotent re-run)
        cleaned = DEPENDENCY_HEADER_RE.sub('', current_desc).lstrip('\n').rstrip()
        # Build new header
        header = build_dependency_header(upstreams, manifest)
        new_desc = header + '\n---\n\n' + cleaned
        # Update
        update_task(task_id, new_desc)
        print(f'  ✓ description updated (length: {len(current_desc)} → {len(new_desc)} chars)')
        time.sleep(0.3)

    print('\n' + '=' * 72)
    print('Done. Each downstream task now opens with a prominent Dependencies')
    print('section listing upstream tasks with hyperlinks to their ClickUp URLs.')


if __name__ == '__main__':
    main()
