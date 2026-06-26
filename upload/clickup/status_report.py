#!/usr/bin/env python3
"""Build a sprint-by-sprint status report from the ClickUp dump."""
import json, re
from collections import OrderedDict, defaultdict

d = json.load(open('/home/z/my-project/upload/clickup/clickup_full_dump.json'))

def sprint_key(name):
    m = re.match(r'(S\d+)[-–]', name) or re.match(r'(S\d+)\s', name)
    return m.group(1) if m else None

buckets = OrderedDict()
buckets['S1'] = []
buckets['S1-QA'] = []
buckets['S2'] = []
buckets['S3'] = []
buckets['S4'] = []
buckets['S5'] = []
buckets['OTHER'] = []

for t in d:
    n = t['name']
    if n.startswith('S1-QA'):
        buckets['S1-QA'].append(t)
    elif n.startswith('S1-T'):
        buckets['S1'].append(t)
    elif n.startswith('S2'):
        buckets['S2'].append(t)
    elif n.startswith('S3'):
        buckets['S3'].append(t)
    elif n.startswith('S4'):
        buckets['S4'].append(t)
    elif n.startswith('S5'):
        buckets['S5'].append(t)
    else:
        buckets['OTHER'].append(t)

def status_label(t):
    s = t['status'].get('status','?')
    tp = t['status'].get('type','?')
    return f"{s} ({tp})"

print('=' * 80)
print('CHATCO PROJECT — FULL SPRINT STATUS (from ClickUp, incl. closed)')
print('=' * 80)
print(f"Total tasks: {len(d)}")
print()

for sprint, ts in buckets.items():
    if not ts: continue
    closed = [t for t in ts if t['status'].get('type') == 'closed']
    open_ = [t for t in ts if t['status'].get('type') == 'open']
    inp = [t for t in ts if 'in progress' in t['status'].get('status','').lower()]
    s4 = [t for t in ts if t['status'].get('status') == 's4']
    print(f"\n### {sprint} — {len(ts)} tasks ({len(closed)} closed, {len(open_)} open, {len(inp)} in-progress, {len(s4)} s4)")
    print('-' * 80)
    # Sort: closed first, then by task code
    ts_sorted = sorted(ts, key=lambda t: (
        0 if t['status'].get('type') == 'closed' else 1,
        t['name']
    ))
    for t in ts_sorted:
        assignees = ', '.join(a.get('username') or a.get('email','?').split('@')[0] for a in t['assignees']) or '—'
        print(f"  [{t['status'].get('status','?'):18}] {t['name'][:70]:70} | {assignees}")

# Save standalone report
with open('/home/z/my-project/upload/clickup/status_report.txt', 'w') as f:
    import sys
    import io
    old = sys.stdout
    sys.stdout = io.StringIO()
    # rerun print
    print('=' * 80, file=sys.stdout)
    print('CHATCO PROJECT — FULL SPRINT STATUS (from ClickUp, incl. closed)', file=sys.stdout)
    print('=' * 80, file=sys.stdout)
    print(f"Total tasks: {len(d)}", file=sys.stdout)
    for sprint, ts in buckets.items():
        if not ts: continue
        closed = [t for t in ts if t['status'].get('type') == 'closed']
        open_ = [t for t in ts if t['status'].get('type') == 'open']
        inp = [t for t in ts if 'in progress' in t['status'].get('status','').lower()]
        s4 = [t for t in ts if t['status'].get('status') == 's4']
        print(f"\n### {sprint} — {len(ts)} tasks ({len(closed)} closed, {len(open_)} open, {len(inp)} in-progress, {len(s4)} s4)", file=sys.stdout)
        print('-' * 80, file=sys.stdout)
        ts_sorted = sorted(ts, key=lambda t: (
            0 if t['status'].get('type') == 'closed' else 1,
            t['name']
        ))
        for t in ts_sorted:
            assignees = ', '.join(a.get('username') or a.get('email','?').split('@')[0] for a in t['assignees']) or '—'
            print(f"  [{t['status'].get('status','?'):18}] {t['name'][:70]:70} | {assignees}", file=sys.stdout)
    sys.stdout = old
print()
print('Saved status_report.txt')
