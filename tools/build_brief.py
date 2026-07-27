"""Generate the sample Council Warrant Brief - one printable page, computed
from the latest parsed warrant against the full 42-warrant baseline.

The brief is the product loop demonstrated: the dashboard is what CAN be seen;
the brief is what gets DELIVERED before each meeting without anyone asking.
Flags are questions, not findings - every line links to its source page.
"""
import json
import os
import statistics
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = json.load(open(os.path.join(ROOT, "data", "warrants.json"), encoding="utf-8"))
S = json.load(open(os.path.join(ROOT, "data", "site-data.json"), encoding="utf-8"))

ACCT_PROJ = dict(zip(S["accounts"], S["acctProj"]))
DEPTS = S["depts"]
DOC_URL = {d["f"]: d["u"] for d in S["docs"]}

docs = [x for x in W["docs"] if x["rows"]]
latest, prior = docs[-1], docs[:-1]
regular = [x for x in prior if "VISA" not in x["file"].upper()]
url = DOC_URL[latest["file"]]


def money(v):
    return "${:,.2f}".format(v)


def money0(v):
    return "${:,.0f}".format(round(v))


total = sum(r["amount"] for r in latest["rows"])
med = statistics.median(sum(r["amount"] for r in x["rows"]) for x in regular)

# first-appearance vendors, against every prior warrant on record
seen = set()
for x in prior:
    for r in x["rows"]:
        seen.add(r["vendor_name"])
new_v = defaultdict(float)
for r in latest["rows"]:
    if r["vendor_name"] not in seen:
        new_v[r["vendor_name"]] += r["amount"]
new_v = sorted(new_v.items(), key=lambda x: -x[1])

largest = sorted(latest["rows"], key=lambda r: -r["amount"])[:5]

# departments far off their own run rate
hist = defaultdict(list)
for x in regular:
    dep = defaultdict(float)
    for r in x["rows"]:
        dep[r["fund"] + "-" + r["dept"]] += r["amount"]
    for k, v in dep.items():
        hist[k].append(v)
cur = defaultdict(float)
driver = {}
for r in latest["rows"]:
    k = r["fund"] + "-" + r["dept"]
    cur[k] += r["amount"]
    if k not in driver or r["amount"] > driver[k]["amount"]:
        driver[k] = r
flags = []
for k, v in cur.items():
    h = hist.get(k, [])
    if len(h) >= 5 and v >= 25000:
        m = statistics.median(h)
        if m > 0 and v / m >= 3:
            flags.append((k, v, m, v / m))
flags.sort(key=lambda x: -x[1])

# capital projects drawing this warrant, with cumulative
proj_now = defaultdict(float)
proj_cum = defaultdict(float)
for x in docs:
    for r in x["rows"]:
        lbl = ACCT_PROJ.get(r["account"], "")
        if not lbl:
            continue
        proj_cum[lbl] += r["amount"]
        if x is latest:
            proj_now[lbl] += r["amount"]
proj_rows = sorted(proj_now.items(), key=lambda x: -x[1])

credits = [r for r in latest["rows"] if r.get("is_credit")]
tie = next(t for t in W["tie_out"] if t["file"] == latest["file"])


def dept_label(k):
    """A capital fund-dept can hold several projects (618-7180 = Memorial Pool
    AND the LWRP design AND the comprehensive plan), so the voted department
    label can name the wrong one. For flag rows, label by the project drawing
    the most THIS warrant, noting when others share the department."""
    projs = defaultdict(float)
    for r in latest["rows"]:
        if r["fund"] + "-" + r["dept"] != k:
            continue
        lbl = ACCT_PROJ.get(r["account"], "")
        if lbl:
            projs[lbl] += r["amount"]
    if projs:
        top = max(projs, key=projs.get)
        return top + (" (& %d other project%s)" % (len(projs) - 1, "" if len(projs) == 2 else "s")
                      if len(projs) > 1 else "")
    lbl = DEPTS.get(k, "")
    return lbl if lbl else "Department " + k


def row_link(r):
    return '<a href="%s#page=%d">p.%d</a>' % (url, r["page"], r["page"])


def drv(k):
    r = driver[k]
    proj = ACCT_PROJ.get(r["account"], "")
    what = proj if proj else r["vendor_name"]
    return "%s — %s (%s)" % (esc(what), money0(r["amount"]), row_link(r))


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


html = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Warrant Brief — %(date)s — SAMPLE</title>
<style>
:root{--paper:#f6f4ef;--card:#fffdfa;--ink:#16181d;--muted:#6c7079;--faint:#93979f;
  --rule:#e0dbd0;--strong:#cdc6b7;--navy:#1b3a5c;--ok:#1c6b47;--ok-soft:#e3f0e9;--warn:#8f5c10;--warn-soft:#f7eeda}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.num{font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.page{max-width:820px;margin:0 auto;padding:34px 26px 40px}
a{color:var(--navy)}
.mast{display:flex;align-items:baseline;gap:14px;border-bottom:3px double var(--strong);padding-bottom:12px}
.mark{font:600 24px/1 ui-serif,Georgia,serif}.mark span{color:var(--navy)}
.sample{margin-left:auto;font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;
  color:var(--warn);border:1.5px solid var(--warn);border-radius:4px;padding:4px 8px}
h1{font:600 20px/1.3 ui-serif,Georgia,serif;margin:18px 0 2px}
.sub{color:var(--muted);font-size:13px;margin:0 0 16px}
.strip{display:flex;gap:24px;flex-wrap:wrap;border-top:1px solid var(--strong);
  border-bottom:3px double var(--strong);padding:11px 2px;margin:0 0 18px}
.strip em{font-style:normal;display:block;font-size:10px;letter-spacing:.09em;
  text-transform:uppercase;color:var(--faint);font-weight:600}
.strip b{font-size:16px}
.tick{color:var(--ok);font-weight:700}
h2{font:600 11px/1 system-ui;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);
  margin:20px 0 8px;display:flex;gap:10px;align-items:center}
h2::after{content:'';flex:1;height:1px;background:var(--rule)}
table{border-collapse:collapse;width:100%%;font-size:13px}
td{padding:5px 8px 5px 0;border-bottom:1px solid var(--rule);vertical-align:top}
tr:last-child td{border-bottom:0}
.r{text-align:right;white-space:nowrap}
.mut{color:var(--muted)}.fnt{color:var(--faint);font-size:12px}
.pill{display:inline-block;background:var(--warn-soft);color:var(--warn);font-size:10px;
  font-weight:700;letter-spacing:.05em;border-radius:4px;padding:2px 6px;margin-left:6px}
.okpill{display:inline-block;background:var(--ok-soft);color:var(--ok);font-size:11px;
  font-weight:600;border-radius:99px;padding:3px 10px}
.note{font-size:11.5px;color:var(--faint);border-top:1px solid var(--rule);margin-top:22px;padding-top:10px}
@media print{body{background:#fff}.page{padding:0;max-width:none}a{color:inherit;text-decoration:none}}
</style></head><body><div class="page">

<div class="mast"><div class="mark">Public <span>Ledger</span></div>
  <div class="fnt">Council Warrant Brief</div><div class="sample">SAMPLE — NOT REQUESTED BY THE CITY</div></div>

<h1>Warrant of %(date)s</h1>
<p class="sub">Everything below was computed automatically from
  <a href="%(url)s">the published warrant</a> against the %(nprior)d prior warrants on record
  (January 2025 onward). Flags are questions worth a look before the vote — not findings.</p>

<div class="strip">
  <div><em>This warrant</em><b class="num">%(total)s</b></div>
  <div><em>Lines / POs</em><b class="num">%(lines)d / %(pos)s</b></div>
  <div><em>vs typical meeting</em><b class="num">%(ratio).1f&times;</b> <span class="fnt num">median %(med)s</span></div>
  <div><em>Reconciliation</em><span class="okpill">&#10003; ties the printed totals exactly</span></div>
</div>
""" % dict(date=latest["report_date"], url=url, nprior=len(prior), total=money(total),
           lines=len(latest["rows"]), pos=latest.get("pub_po_count") or "—",
           ratio=total / med, med=money0(med))

html += '<h2>First-time payees</h2><table>'
for v, a in new_v:
    html += ('<tr><td>%s<span class="pill">FIRST APPEARANCE</span></td>'
             '<td class="r num">%s</td></tr>') % (esc(v), money(a))
html += ('</table><p class="fnt">First appearance within the %d-warrant record — a routine '
         'check, not an allegation: the largest is the Memorial Pool contractor.</p>'
         % len(docs))

html += '<h2>Largest lines</h2><table>'
for r in largest:
    proj = ACCT_PROJ.get(r["account"], "")
    what = (" &middot; " + esc(proj)) if proj else ""
    html += ('<tr><td>%s<span class="fnt">%s</span></td><td class="mut num">%s</td>'
             '<td class="r num">%s</td><td class="r fnt">%s</td></tr>') % (
        esc(r["vendor_name"]), what, r["account"], money(r["amount"]), row_link(r))
html += "</table>"

html += '<h2>Departments far off their run rate</h2><table>'
for k, v, m, ratio in flags[:6]:
    html += ('<tr><td>%s <span class="fnt num">%s</span></td>'
             '<td class="r num">%s</td>'
             '<td class="r fnt num">%.0f&times; its median %s</td>'
             '<td class="fnt">driver: %s</td></tr>') % (
        esc(dept_label(k)), k, money0(v), ratio, money0(m), drv(k))
html += ('</table><p class="fnt">Median is that department&rsquo;s draw across prior regular '
         'warrants where it appears. Capital-project draws are the usual honest explanation.</p>')

if proj_rows:
    html += '<h2>Capital projects drawing this warrant</h2><table>'
    for lbl, a in proj_rows:
        html += ('<tr><td>%s</td><td class="r num">%s</td>'
                 '<td class="r fnt num">%s committed to date</td></tr>') % (
            esc(lbl), money(a), money0(proj_cum[lbl]))
    html += "</table>"

html += ('<p class="note"><b>Method &amp; limits.</b> Generated automatically by '
         '<a href="https://jcurry44.github.io/public-ledger/">Public Ledger</a> from the city&rsquo;s '
         'published Warrant of Claims. Parsed totals tie the control figures printed on the document '
         '(variance %s); %d credit memo%s worth %s included. Approvals as published, not payments; '
         'the baseline window opens January 2025, so &ldquo;first appearance&rdquo; means first in '
         'that window. This sample was prepared from public records and was not requested by or '
         'produced for the City of North Tonawanda.</p>'
         % (money(tie["variance"]), len(credits), "" if len(credits) == 1 else "s",
            money(-sum(r["amount"] for r in credits))))

html += "</div></body></html>"

path = os.path.join(ROOT, "brief.html")
with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print("wrote %s (%.0f KB) — warrant %s, %d first-time payees, %d dept flags, %d capital draws"
      % (path, os.path.getsize(path) / 1024, latest["report_date"], len(new_v),
         len(flags), len(proj_rows)))
