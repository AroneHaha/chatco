#!/usr/bin/env python3
"""
Push all 12 Sprint 6 tasks (S6-T1 .. S6-T12) to ClickUp's E-CHATCO list.

Source: /home/z/my-project/upload/clickup/S6-TASKS.md
Target list: E-CHATCO (901615041878) in DEV & DOCU space (90167055028)

Pipeline:
  1. Parse S6-TASKS.md to extract task id (S6-Tx), title, layer, depends_on, and the
     markdown description (the content inside ``` fences).
  2. Ensure the four layer tags (backend / frontend / test / security) exist on the space.
  3. Create each task on the E-CHATCO list with status='s4' (ready-to-start / backlog).
  4. Tag each task with its layer.
  5. Wire dependencies per the index table at the top of S6-TASKS.md.
  6. Emit a final JSON manifest of the created tasks for audit.

Idempotency:
  Before creating, the script queries the live list and skips any task whose name
  already starts with `S6-T<n> -`. This makes the script safe to re-run.
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
TOKEN = 'pk_312703695_K4M6P3NRSH0OPZ3SAPAQT1EZ713MV7LE'
SPACE_ID = '90167055028'
LIST_ID = '901615041878'
STATUS = 's4'  # ready-to-start / backlog on E-CHATCO list
TASKS_MD = '/home/z/my-project/upload/clickup/S6-TASKS.md'
MANIFEST_OUT = '/home/z/my-project/upload/clickup/s6_created_manifest.json'

HEADERS = {
    'Authorization': TOKEN,
    'Content-Type': 'application/json',
}

# Layer tag -> ClickUp tag color (hex without #)
TAG_COLORS = {
    'backend':  '#1090e0',  # blue-ish
    'frontend': '#6fddff',  # cyan
    'test':     '#f8ae00',  # amber
    'security': '#f50000',  # red
}

# Task ID -> layer (from the index table at the top of S6-TASKS.md)
LAYER_BY_TASK = {
    'S6-T1':  'backend',
    'S6-T2':  'backend',
    'S6-T3':  'backend',
    'S6-T4':  'backend',
    'S6-T5':  'backend',
    'S6-T6':  'frontend',
    'S6-T7':  'frontend',
    'S6-T8':  'frontend',
    'S6-T9':  'frontend',
    'S6-T10': 'frontend',
    'S6-T11': 'test',
    'S6-T12': 'security',
}

# Dependency edges (downstream -> list of upstreams it depends on)
DEPENDENCIES = {
    'S6-T6':  ['S6-T1'],
    'S6-T7':  ['S6-T2'],
    'S6-T8':  ['S6-T3'],
    'S6-T9':  ['S6-T4'],
    'S6-T10': ['S6-T5'],
    'S6-T11': ['S6-T1', 'S6-T2', 'S6-T3', 'S6-T4', 'S6-T5'],
    'S6-T12': ['S6-T1', 'S6-T2', 'S6-T3', 'S6-T4', 'S6-T5'],
}


# ----------------------------------------------------------------------------
# HTTP helpers (stdlib only — no external deps)
# ----------------------------------------------------------------------------
def api_call(method, url, payload=None, retries=4):
    """Make a ClickUp API call with simple retry/backoff."""
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
            # 429 = rate-limited; 5xx = transient — retry with backoff
            if e.code in (429, 500, 502, 503, 504) and attempt < retries:
                wait = 2 ** attempt
                print(f'    [retry {attempt}/{retries}] {e.code} on {method} {url} — waiting {wait}s')
                time.sleep(wait)
                last_err = (e.code, err_body)
                continue
            raise RuntimeError(f'HTTP {e.code} on {method} {url}: {err_body}') from e
        except urllib.error.URLError as e:
            if attempt < retries:
                wait = 2 ** attempt
                print(f'    [retry {attempt}/{retries}] URLError {e} — waiting {wait}s')
                time.sleep(wait)
                last_err = str(e)
                continue
            raise
    raise RuntimeError(f'Exhausted retries for {method} {url}: {last_err}')


# ----------------------------------------------------------------------------
# Parser: extract 12 tasks from S6-TASKS.md
# ----------------------------------------------------------------------------
def parse_tasks(md_text):
    """
    Each task block looks like:

        ### S6-T1 - <Title>

        **Description:**
        ```
        <markdown body — this becomes the ClickUp description>
        ```

        ---

    Returns a list of dicts: { task_id, title, description, layer }
    """
    tasks = []
    # Match each task section header + fenced description
    pattern = re.compile(
        r'###\s+(S6-T\d+)\s+-\s+(.+?)\n\n\*\*Description:\*\*\n```\n(.*?)\n```',
        re.DOTALL,
    )
    for m in pattern.finditer(md_text):
        task_id = m.group(1).strip()
        title = m.group(2).strip()
        description = m.group(3).strip()
        layer = LAYER_BY_TASK.get(task_id, 'backend')
        tasks.append({
            'task_id': task_id,
            'title': title,
            'description': description,
            'layer': layer,
            'clickup_name': f'{task_id} - {title}',
        })
    return tasks


# ----------------------------------------------------------------------------
# Tag management
# ----------------------------------------------------------------------------
def ensure_space_tag(tag_name, color_hex):
    """Create the tag on the space if it doesn't exist. ClickUp dedupes by name."""
    # ClickUp v2 expects the tag fields nested under a "tag" key
    payload = {
        'tag': {
            'name': tag_name,
            'tag_fg': '#000000',
            'tag_bg': color_hex,
        }
    }
    try:
        api_call('POST', f'https://api.clickup.com/api/v2/space/{SPACE_ID}/tag', payload=payload)
        print(f'  [tag] created/ensured: {tag_name}')
    except RuntimeError as e:
        # If the tag already exists, ClickUp returns 409 — that's fine
        if '409' in str(e):
            print(f'  [tag] already exists: {tag_name}')
        else:
            raise


def add_tag_to_task(task_id, tag_name):
    api_call('POST', f'https://api.clickup.com/api/v2/task/{task_id}/tag/{tag_name}')
    print(f'    -> tagged with {tag_name}')


# ----------------------------------------------------------------------------
# Task management
# ----------------------------------------------------------------------------
def list_existing_tasks():
    """Return dict of name -> id for all tasks currently on the list (live)."""
    out = {}
    page = 0
    while True:
        d = api_call('GET', f'https://api.clickup.com/api/v2/list/{LIST_ID}/task?page={page}&subtasks=false&include_closed=true')
        tasks = d.get('tasks', []) or []
        if not tasks:
            break
        for t in tasks:
            out[t['name']] = t['id']
        # ClickUp returns 100 per page; stop if last page
        if len(tasks) < 100:
            break
        page += 1
    return out


def create_task(name, description, layer):
    """Create a task on the E-CHATCO list with status=s4. Returns the new task id."""
    payload = {
        'name': name,
        'description': description,
        'status': STATUS,
        # Tag at creation time too — saves a round-trip
        'tags': [{'name': layer}],
    }
    resp = api_call('POST', f'https://api.clickup.com/api/v2/list/{LIST_ID}/task', payload=payload)
    return resp.get('id'), resp.get('url')


def set_dependency(downstream_id, upstream_id):
    """Mark downstream_id as depending_on upstream_id."""
    payload = {
        'dependency_id': upstream_id,
        'depends_on': True,  # downstream depends on upstream
    }
    api_call('POST', f'https://api.clickup.com/api/v2/task/{downstream_id}/dependency', payload=payload)


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
def main():
    print('=' * 72)
    print('Pushing Sprint 6 tasks (S6-T1 .. S6-T12) to ClickUp E-CHATCO list')
    print('=' * 72)

    # 1. Parse the markdown source
    with open(TASKS_MD, 'r', encoding='utf-8') as f:
        md_text = f.read()
    tasks = parse_tasks(md_text)
    if len(tasks) != 12:
        print(f'!! Parsed {len(tasks)} tasks — expected 12. Aborting.')
        sys.exit(1)
    print(f'\n[1/5] Parsed {len(tasks)} task specs from S6-TASKS.md')
    for t in tasks:
        print(f'      - {t["clickup_name"]}  (layer={t["layer"]}, desc={len(t["description"])} chars)')

    # 2. Ensure layer tags exist on the space
    print('\n[2/5] Ensuring layer tags exist on space DEV & DOCU')
    for tag, color in TAG_COLORS.items():
        ensure_space_tag(tag, color)

    # 3. Check live list for existing S6 tasks (idempotency)
    print('\n[3/5] Checking live list for pre-existing S6 tasks')
    existing = list_existing_tasks()
    s6_existing = {n: i for n, i in existing.items() if n.startswith('S6-T')}
    print(f'      Found {len(s6_existing)} existing S6 tasks on list')
    for n, i in s6_existing.items():
        print(f'      - {n} (id={i})')

    # 4. Create each task (skip if already exists)
    print('\n[4/5] Creating / confirming tasks')
    created = {}
    for t in tasks:
        name = t['clickup_name']
        if name in s6_existing:
            print(f'  [skip] {name} already exists (id={s6_existing[name]})')
            created[t['task_id']] = {
                'name': name,
                'id': s6_existing[name],
                'url': f'https://app.clickup.com/t/{s6_existing[name]}',
                'layer': t['layer'],
                'created_now': False,
            }
            continue
        print(f'  [create] {name}')
        task_id, url = create_task(name, t['description'], t['layer'])
        if not task_id:
            print(f'    !! no id returned — aborting')
            sys.exit(1)
        print(f'    -> id={task_id}  url={url}')
        created[t['task_id']] = {
            'name': name,
            'id': task_id,
            'url': url or f'https://app.clickup.com/t/{task_id}',
            'layer': t['layer'],
            'created_now': True,
        }
        # gentle rate-limit courtesy
        time.sleep(0.4)

    # 5. Set dependencies
    print('\n[5/5] Wiring task dependencies')
    for downstream, upstreams in DEPENDENCIES.items():
        d_id = created[downstream]['id']
        for up in upstreams:
            u_id = created[up]['id']
            try:
                set_dependency(d_id, u_id)
                print(f'  {downstream} depends_on {up}  ({d_id} -> {u_id})')
            except RuntimeError as e:
                # ClickUp returns 400 if dependency already exists or cycles — log and continue
                print(f'  {downstream} depends_on {up}  -> skipped ({e})')
            time.sleep(0.2)

    # Save manifest
    with open(MANIFEST_OUT, 'w', encoding='utf-8') as f:
        json.dump(created, f, indent=2)
    print(f'\nManifest saved: {MANIFEST_OUT}')

    # Final summary
    print('\n' + '=' * 72)
    print('DONE. Sprint 6 task inventory on ClickUp:')
    print('=' * 72)
    for tid in sorted(created.keys(), key=lambda x: int(x.split('-T')[1])):
        info = created[tid]
        marker = 'NEW' if info['created_now'] else 'pre-existing'
        print(f'  {tid:8}  [{marker:13}]  {info["layer"]:8}  {info["url"]}')
    print('\nAll 12 S6 tasks are now on the E-CHATCO list with full descriptions,')
    print('layer tags, and dependency edges. Open the list to verify:')


if __name__ == '__main__':
    main()
