#!/usr/bin/env python3
"""Enrich ClickUp task dump with comments + attachments, then build a readable Markdown summary."""
import json, os, re, time, urllib.request, html

TOKEN = 'pk_312703695_K4M6P3NRSH0OPZ3SAPAQT1EZ713MV7LE'
HEADERS = {'Authorization': TOKEN}
WORKDIR = '/home/z/my-project/upload/clickup'

def api_get(url, max_retries=5):
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            if attempt == max_retries - 1:
                return {'_error': str(e)}
            time.sleep(1.5 * (attempt + 1))
    return {'_error': 'unknown'}

# Load all tasks (use the include_closed response)
tasks = []
for f in sorted(os.listdir(WORKDIR)):
    if f.startswith('tasks_closed_all') or f.startswith('tasks_page_'):
        with open(os.path.join(WORKDIR, f)) as fp:
            data = json.load(fp)
            tasks.extend(data.get('tasks', []))

# Dedupe by task id
seen = set()
unique_tasks = []
for t in tasks:
    if t['id'] not in seen:
        seen.add(t['id'])
        unique_tasks.append(t)
print(f'Total unique tasks: {len(unique_tasks)}')

def strip_html(text):
    if not text:
        return ''
    # Replace common tags
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.I)
    text = re.sub(r'</?p[^>]*>', '\n', text, flags=re.I)
    text = re.sub(r'</?div[^>]*>', '\n', text, flags=re.I)
    text = re.sub(r'</li>', '\n', text, flags=re.I)
    text = re.sub(r'<li[^>]*>', '• ', text, flags=re.I)
    text = re.sub(r'<h[1-6][^>]*>', '\n## ', text, flags=re.I)
    text = re.sub(r'</h[1-6]>', '\n', text, flags=re.I)
    text = re.sub(r'<[^>]+>', '', text)  # strip remaining tags
    text = html.unescape(text)
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    return text

def fmt_date(ms):
    if not ms:
        return ''
    try:
        ms = int(ms)
        return time.strftime('%Y-%m-%d %H:%M', time.gmtime(ms/1000))
    except Exception:
        return str(ms)

# Enrich each task with comments + attachments
enriched = []
for i, t in enumerate(unique_tasks):
    tid = t['id']
    # Comments
    comments = []
    cpage = 0
    while True:
        cr = api_get(f'https://api.clickup.com/api/v2/task/{tid}/comment?start={cpage}')
        if '_error' in cr:
            comments.append({'_error': cr['_error']})
            break
        batch = cr.get('comments', [])
        comments.extend(batch)
        if len(batch) < 25:
            break
        cpage += 1
        if cpage > 10: break
    # Attachments (already in task['attachments'], but also fetch explicitly)
    if 'attachments' not in t:
        t['attachments'] = []
    print(f'[{i+1}/{len(unique_tasks)}] {tid} | {t["name"][:60]} | {len(comments)} comments | {len(t["attachments"])} attachments')
    enriched.append({
        'id': tid,
        'name': t['name'],
        'status': t.get('status', {}),
        'assignees': t.get('assignees', []),
        'date_created': fmt_date(t.get('date_created')),
        'date_updated': fmt_date(t.get('date_updated')),
        'date_closed': fmt_date(t.get('date_closed')),
        'due_date': fmt_date(t.get('due_date')),
        'priority': t.get('priority'),
        'tags': t.get('tags', []),
        'custom_fields': t.get('custom_fields', []),
        'parent': t.get('parent'),
        'description_html': t.get('description', ''),
        'description_text': strip_html(t.get('description', '')),
        'attachments': t['attachments'],
        'comments': comments,
        'url': t.get('url', f'https://app.clickup.com/t/{tid}'),
    })

# Save enriched JSON
with open(os.path.join(WORKDIR, 'clickup_full_dump.json'), 'w') as f:
    json.dump(enriched, f, indent=2, ensure_ascii=False)
print(f'\nSaved clickup_full_dump.json ({len(enriched)} tasks)')

# Build Markdown summary
def sprint_of(name):
    m = re.match(r'(S\d+)', name)
    return m.group(1) if m else 'OTHER'

by_sprint = {}
for t in enriched:
    s = sprint_of(t['name'])
    by_sprint.setdefault(s, []).append(t)

md = []
md.append('# ChatCo — Full ClickUp Task Dump (incl. closed)')
md.append('')
md.append(f'- **Workspace:** E-Chatco Workspace (team 90161628825)')
md.append(f'- **Space:** DEV & DOCU (90167055028)')
md.append(f'- **List:** E-CHATCO (901615041878)')
md.append(f'- **Total tasks dumped:** {len(enriched)} (open + closed)')
md.append(f'- **Generated:** {time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime())}')
md.append('')
md.append('---')
md.append('')
md.append('## Status overview by sprint')
md.append('')
md.append('| Sprint | Total | Open | Closed | In Progress | s4 |')
md.append('|---|---|---|---|---|---|')
for s in sorted(by_sprint.keys()):
    ts = by_sprint[s]
    closed = sum(1 for t in ts if t['status'].get('type') == 'closed')
    open_ = sum(1 for t in ts if t['status'].get('type') == 'open')
    inp = sum(1 for t in ts if 'in progress' in t['status'].get('status','').lower())
    s4 = sum(1 for t in ts if t['status'].get('status') == 's4')
    md.append(f'| {s} | {len(ts)} | {open_} | {closed} | {inp} | {s4} |')
md.append('')
md.append('---')
md.append('')

for s in sorted(by_sprint.keys()):
    md.append(f'## {s} ({len(by_sprint[s])} tasks)')
    md.append('')
    # Sort: open first (by status, then by id), then closed
    ts_sorted = sorted(by_sprint[s], key=lambda t: (
        0 if t['status'].get('type') == 'open' else 1,
        t['status'].get('status', ''),
        t['name']
    ))
    for t in ts_sorted:
        md.append(f'### {t["name"]}')
        md.append(f'- **ID:** `{t["id"]}`')
        md.append(f'- **Status:** `{t["status"].get("status","?")}` ({t["status"].get("type","?")})')
        assignees = ', '.join(a.get('username') or a.get('email','?') for a in t['assignees']) or '—'
        md.append(f'- **Assignees:** {assignees}')
        if t['date_created']: md.append(f'- **Created:** {t["date_created"]}')
        if t['date_updated']: md.append(f'- **Updated:** {t["date_updated"]}')
        if t['date_closed']: md.append(f'- **Closed:** {t["date_closed"]}')
        if t['due_date']: md.append(f'- **Due:** {t["due_date"]}')
        if t['tags']:
            md.append(f'- **Tags:** {", ".join(tag["name"] for tag in t["tags"])}')
        # Custom fields
        for cf in t['custom_fields']:
            v = cf.get('value')
            if v is None: continue
            if isinstance(v, list):
                v = ', '.join(str(x) for x in v)
            md.append(f'- **{cf.get("name","?")}:** {v}')
        md.append(f'- **URL:** {t["url"]}')
        if t['description_text']:
            md.append('')
            md.append('**Description:**')
            md.append('```')
            md.append(t['description_text'])
            md.append('```')
        if t['attachments']:
            md.append('')
            md.append('**Attachments:**')
            for a in t['attachments']:
                md.append(f'- {a.get("title","untitled")} → {a.get("url","")}')
        if t['comments']:
            md.append('')
            md.append(f'**Comments ({len(t["comments"])}):**')
            for c in t['comments']:
                user = c.get('user', {}).get('username') or c.get('user', {}).get('email','?')
                date = fmt_date(c.get('date'))
                text = strip_html(c.get('text', ''))
                md.append(f'- **[{date}] {user}:** {text}')
                for a in c.get('attachments', []):
                    md.append(f'  - attachment: {a.get("title","untitled")} → {a.get("url","")}')
        md.append('')
    md.append('---')
    md.append('')

with open(os.path.join(WORKDIR, 'clickup_all_tasks.md'), 'w') as f:
    f.write('\n'.join(md))
print(f'\nSaved clickup_all_tasks.md ({len(md)} lines)')
print(f'Workspace: {WORKDIR}')
