"""Profile the parsed corpus - the raw material for the dashboard views."""
import json
import os
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, "data", "warrants.json"), encoding="utf-8"))
rows = [r for doc in d["docs"] for r in doc["rows"]]

print("rows              %d" % len(rows))
print("purchase orders   %d" % len(set(r["po"] for r in rows)))
print("vendor codes      %d" % len(set(r["vendor_code"] for r in rows)))
print("vendor names      %d" % len(set(r["vendor_name"] for r in rows)))
print("charge accounts   %d" % len(set(r["account"] for r in rows)))
print("funds             %d" % len(set(r["fund"] for r in rows)))
print("fund-departments  %d" % len(set((r["fund"], r["dept"]) for r in rows)))
print("credits           %d  ($%s)" % (
    sum(1 for r in rows if r.get("is_credit")),
    "{:,.2f}".format(-sum(r["amount"] for r in rows if r.get("is_credit")))))
print("total             $%s" % "{:,.2f}".format(sum(r["amount"] for r in rows)))

print("\n--- top 12 vendors by spend ---")
v = defaultdict(float)
vn = defaultdict(set)
for r in rows:
    v[r["vendor_name"]] += r["amount"]
    vn[r["vendor_name"]].add(r["account"])
for name, amt in sorted(v.items(), key=lambda x: -x[1])[:12]:
    print("  %-42s %14s  %3d accts" % (name[:42], "{:,.2f}".format(amt), len(vn[name])))

print("\n--- coding sprawl: most account codes per vendor ---")
for name, accts in sorted(vn.items(), key=lambda x: -len(x[1]))[:10]:
    n = sum(1 for r in rows if r["vendor_name"] == name)
    print("  %-42s %3d accts  %4d rows  %14s" % (
        name[:42], len(accts), n, "{:,.2f}".format(v[name])))

print("\n--- vendor master hygiene: names with >1 vendor code ---")
byname = defaultdict(set)
for r in rows:
    byname[r["vendor_name"]].add(r["vendor_code"])
dupes = {k: s for k, s in byname.items() if len(s) > 1}
print("  %d names carry multiple codes" % len(dupes))
for k, s in sorted(dupes.items(), key=lambda x: -len(x[1]))[:8]:
    print("    %-40s %s" % (k[:40], sorted(s)))

print("\n--- codes shared by >1 name (name drift) ---")
bycode = defaultdict(set)
for r in rows:
    bycode[r["vendor_code"]].add(r["vendor_name"])
drift = {k: s for k, s in bycode.items() if len(s) > 1}
print("  %d codes carry multiple names" % len(drift))
for k, s in list(sorted(drift.items(), key=lambda x: -len(x[1])))[:6]:
    print("    %-10s %s" % (k, sorted(s)[:3]))
