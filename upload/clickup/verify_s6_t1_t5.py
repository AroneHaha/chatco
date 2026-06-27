#!/usr/bin/env python3
"""Verify current state of S6-T1 through S6-T5 in ClickUp before marking complete."""
import urllib.request
import json
import sys

TOKEN = "pk_312703695_K4M6P3NRSH0OPZ3SAPAQT1EZ713MV7LE"
HEADERS = {"Authorization": TOKEN}

TASK_IDS = {
    "S6-T1": "86d3g1um2",
    "S6-T2": "86d3g1um4",
    "S6-T3": "86d3g1um5",
    "S6-T4": "86d3g1um7",
    "S6-T5": "86d3g1um9",
}

def get_task(task_id: str) -> dict:
    url = f"https://api.clickup.com/api/v2/task/{task_id}"
    req = urllib.request.Request(url, headers=HEADERS, method="GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

results = {}
for label, tid in TASK_IDS.items():
    try:
        t = get_task(tid)
        status_obj = t.get("status", {})
        status_str = status_obj.get("status") if isinstance(status_obj, dict) else status_obj
        results[label] = {
            "ok": True,
            "id": tid,
            "name": t.get("name"),
            "status": status_str,
            "url": t.get("url"),
            "description_preview": (t.get("description") or "")[:120].replace("\n", " "),
        }
        print(f"{label} ({tid}): status={status_str!r}  name={t.get('name')!r}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:200]
        results[label] = {"ok": False, "error": f"HTTP {e.code}: {err_body}"}
        print(f"❌ {label} ({tid}): HTTP {e.code}: {err_body}", file=sys.stderr)
    except Exception as e:
        results[label] = {"ok": False, "error": str(e)}
        print(f"❌ {label} ({tid}): {e}", file=sys.stderr)

with open("/home/z/my-project/upload/clickup/s6_t1_t5_verify.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"\nWrote /home/z/my-project/upload/clickup/s6_t1_t5_verify.json")
