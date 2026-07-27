"""Generate the Exception Report (audit.html): every flag the data raises,
computed, ranked, and framed as questions - never findings.

Sections, in order of humility:
  1. Where the record itself is weak (scans, republished duplicates)
  2. Catch-all revenue accounts (the 2770 series)
  3. Accounts far off their own thirty-year history (capital H-funds excluded -
     one-time by nature; the dashboard's project views cover them)
  4. One payee, several vendor master records
  5. Aggregate purchasing the ledger cannot see (coding sprawl)
  6. Large first-time payees (baseline-warmed window only)
Each flag carries the question to ask and where the answer lives.
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
O = json.load(open(os.path.join(ROOT, "data", "osc-data.json"), encoding="utf-8"))

docs = [x for x in W["docs"] if x["rows"]]
scans = [x for x in W["docs"] if not x["rows"] and not x.get("has_text_layer", True)]
FD = O["dict"]
YEARS = O["years"]
LATEST = YEARS[-1]


def money0(v):
    return "${:,.0f}".format(round(v))


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---- OSC account series ----------------------------------------------------
acct_series = defaultdict(lambda: defaultdict(float))   # (sec, code) -> {yr: amt}
acct_narr = {}
acct_l1 = {}
for f in O["flows"]:
    yr, sec, l1, l2, obj, narr, code, amt = f
    acct_series[(sec, code)][yr] += amt
    acct_narr[(sec, code)] = FD["narr"][narr]
    acct_l1[(sec, code)] = FD["l1"][l1]

# ---- flag 2: the 2770 catch-alls -------------------------------------------
catchalls = []
for (sec, code), series in acct_series.items():
    if sec == 0 and code.endswith("2770"):
        latest = series.get(LATEST, 0)
        if latest <= 0:                      # dormant catch-alls are not flags
            continue
        prior = sorted(v for y, v in series.items() if y != LATEST and v > 0)
        med = prior[len(prior) // 2] if prior else 0
        catchalls.append({"code": code, "latest": latest, "med": med,
                          "first": min(series), "narr": acct_narr[(sec, code)]})
catchalls.sort(key=lambda c: -c["latest"])
catch_total = sum(c["latest"] for c in catchalls)

# ---- flag 3: accounts far off their own history (non-capital) --------------
spikes, newcomers = [], []
for (sec, code), series in acct_series.items():
    if code[0] == "H":                       # capital funds: one-time by nature
        continue
    if code.endswith("2770"):                # covered by the catch-all section
        continue
    latest = series.get(LATEST, 0)
    prior = [v for y, v in series.items() if y != LATEST and v > 0]
    if latest >= 50000 and len(prior) >= 5:
        med = statistics.median(prior)
        if med > 0 and latest / med >= 3:
            spikes.append({"sec": sec, "code": code, "latest": latest, "med": med,
                           "ratio": latest / med, "narr": acct_narr[(sec, code)],
                           "l1": acct_l1[(sec, code)]})
    if latest >= 100000 and not prior:
        newcomers.append({"sec": sec, "code": code, "latest": latest,
                          "narr": acct_narr[(sec, code)], "l1": acct_l1[(sec, code)]})
spikes.sort(key=lambda x: -x["latest"])
newcomers.sort(key=lambda x: -x["latest"])

# ---- flag 4: vendor master duplicates (already computed) -------------------
hygiene = S.get("hygiene", [])
V = S["vendors"]

# ---- flag 5: coding sprawl -------------------------------------------------
A = S["accounts"]
sprawl = defaultdict(lambda: {"accts": set(), "sum": 0.0, "n": 0})
for r in S["rows"]:
    v = sprawl[V[r[1]]]
    v["accts"].add(A[r[2]])
    v["sum"] += r[3]
    v["n"] += 1
sprawl_top = sorted(
    ({"name": k, "accts": len(v["accts"]), "sum": v["sum"], "n": v["n"]}
     for k, v in sprawl.items() if len(v["accts"]) >= 10),
    key=lambda x: -x["accts"])

# ---- flag 6: large first-time payees (docs with >= 10 priors) --------------
seen = set()
firsts = []
for i, d in enumerate(docs):
    payee_sum = defaultdict(float)
    for r in d["rows"]:
        payee_sum[r["vendor_name"]] += r["amount"]
    for name, amt in payee_sum.items():
        if name not in seen and i >= 10 and amt >= 100000:
            ctx = defaultdict(float)
            for r in d["rows"]:
                if r["vendor_name"] != name:
                    continue
                proj = ACCT_PROJ.get(r["account"], "")
                key = proj if proj else DEPTS.get(r["fund"] + "-" + r["dept"],
                                                  "Dept " + r["fund"] + "-" + r["dept"])
                ctx[key] += r["amount"]
            top_ctx = sorted(ctx.items(), key=lambda x: -x[1])
            label = top_ctx[0][0] + (" (+%d more)" % (len(top_ctx) - 1) if len(top_ctx) > 1 else "")
            firsts.append({"name": name, "amt": amt, "doc": d, "ctx": label})
    for r in d["rows"]:
        seen.add(r["vendor_name"])
firsts.sort(key=lambda x: -x["amt"])

# Every qualifying flag is counted AND shown - a report about silent gaps
# must not have silent caps of its own.
n_flags = (len(scans) + len(W.get("superseded", [])) + len(catchalls)
           + len(spikes) + len(newcomers) + len(hygiene) + len(sprawl_top)
           + len(firsts))

CSS = """
:root{--paper:#f6f4ef;--card:#fffdfa;--ink:#16181d;--muted:#6c7079;--faint:#93979f;
  --rule:#e0dbd0;--strong:#cdc6b7;--navy:#1b3a5c;--ok:#1c6b47;--ok-soft:#e3f0e9;--warn:#8f5c10;--warn-soft:#f7eeda;
  --bad:#9e2b28;--desk:#e9e3d5}
*{box-sizing:border-box}
html{border-top:5px solid var(--navy);background:var(--desk)}
body{margin:0;background:var(--desk);color:var(--ink);
  font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.num{font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.page{max-width:880px;margin:26px auto 48px;padding:34px 42px 44px;background:var(--paper);
  border-radius:3px;box-shadow:0 0 0 1px var(--strong),0 26px 70px -32px rgba(20,18,10,.45)}
@media (max-width:700px){.page{margin:0;border-radius:0;box-shadow:none;padding:28px 20px 40px}}
a{color:var(--navy)}
.mast{display:flex;align-items:baseline;gap:14px;border-bottom:3px double var(--strong);padding-bottom:12px;flex-wrap:wrap}
.mark{font:600 24px/1 ui-serif,Georgia,serif}.mark span{color:var(--navy)}
.sample{margin-left:auto;font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;
  color:var(--warn);border:1.5px solid var(--warn);border-radius:4px;padding:4px 8px}
h1{font:600 21px/1.3 ui-serif,Georgia,serif;margin:18px 0 2px}
.sub{color:var(--muted);font-size:13.5px;margin:0 0 14px;max-width:78ch}
.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 16px}
.toolbar button{font:600 12.5px/1 system-ui;padding:8px 14px;border:1px solid var(--strong);
  border-radius:99px;background:var(--card);color:var(--muted);cursor:pointer}
.toolbar button:hover{color:var(--ink);border-color:var(--navy)}
.toolbar .back{font-size:12.5px;margin-left:auto}
h2{font:600 11px/1 system-ui;letter-spacing:.11em;text-transform:uppercase;color:var(--faint);
  margin:24px 0 4px;display:flex;gap:10px;align-items:center}
h2::after{content:'';flex:1;height:1px;background:var(--rule)}
h2 .no{color:var(--bad);opacity:.75}
.q{font-size:13px;color:var(--muted);margin:0 0 10px;max-width:80ch}
.q b{color:var(--ink)}
table{border-collapse:collapse;width:100%;font-size:13px}
td,th{padding:6px 8px 6px 0;border-bottom:1px solid var(--rule);vertical-align:top;text-align:left}
th{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--faint);font-weight:600}
tr:last-child td{border-bottom:0}
.r{text-align:right;white-space:nowrap}
.mut{color:var(--muted)}.fnt{color:var(--faint);font-size:12px}
.pill{display:inline-block;background:var(--warn-soft);color:var(--warn);font-size:10px;
  font-weight:700;letter-spacing:.05em;border-radius:4px;padding:2px 6px;margin-left:6px}
.strip{display:flex;gap:26px;flex-wrap:wrap;border-top:1px solid var(--strong);
  border-bottom:3px double var(--strong);padding:11px 2px;margin:0 0 8px}
.strip em{font-style:normal;display:block;font-size:10px;letter-spacing:.09em;
  text-transform:uppercase;color:var(--faint);font-weight:600}
.strip b{font-size:16px}
.note{font-size:11.5px;color:var(--faint);border-top:1px solid var(--rule);margin-top:26px;padding-top:10px}
.tw{overflow-x:auto}
.tw table{min-width:520px}
@media print{html{border-top:0;background:#fff}body{background:#fff}
  .page{padding:0;margin:0;max-width:none;box-shadow:none;border-radius:0}
  a{color:inherit;text-decoration:none}.toolbar{display:none}}
"""

h = "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">\n"
h += '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
h += '<meta name="robots" content="noindex, nofollow">\n'
h += "<title>Exception Report — Public Ledger — SAMPLE</title>\n<style>%s</style></head><body><div class=\"page\">\n" % CSS
h += ('<div class="mast"><div class="mark">Public <span>Ledger</span></div>'
      '<div class="fnt">Exception Report</div>'
      '<div class="sample">SAMPLE — NOT REQUESTED BY THE CITY</div></div>')
h += '<h1>What the record raises</h1>'
h += ('<p class="sub">Every flag below was computed from the public record — no judgment calls, no tips, '
      'no access to anything the city has not published. <b>Each one is a question, not a finding:</b> '
      'the likely explanation for most is routine, and several have answers a treasurer could give in a '
      'sentence. That is the point — these are the questions the data says to ask first.</p>')
h += ('<div class="toolbar"><button type="button" onclick="window.print()">Print / save as PDF</button>'
      '<a class="back" href="index.html">&larr; the full ledger</a></div>')
h += ('<div class="strip">'
      '<div><em>Flags raised</em><b class="num">%d</b></div>'
      '<div><em>From</em><b class="num">%d warrants + %d years of filings</b></div>'
      '<div><em>Generated</em><b class="num">automatically, from source</b></div>'
      '</div>') % (n_flags, len(docs), len(YEARS))

# --- 1. the record itself ---
h += '<h2><span class="no">01</span>Gaps in the published record</h2>'
h += ('<p class="q"><b>The question:</b> can the missing meetings be republished as text? '
      'Five consecutive council meetings (March&ndash;May 2025) plus one other were published as '
      'image-only scans — unreadable to any analysis, this one included. One further file was a '
      'republished duplicate of a warrant already posted.</p>')
h += '<table><thead><tr><th>Document</th><th>Issue</th></tr></thead><tbody>'
for x in scans:
    h += ('<tr><td class="num">%s</td><td class="mut">image-only scan — no text layer</td></tr>'
          % esc(x["file"]))
for x in W.get("superseded", []):
    h += ('<tr><td class="num">%s</td><td class="mut">republished duplicate of %s (excluded from '
          'every figure)</td></tr>' % (esc(x["file"]), esc(x["by"])))
h += '</tbody></table>'

# --- 2. catch-alls ---
h += '<h2><span class="no">02</span>The catch-all accounts</h2>'
h += ('<p class="q"><b>The question:</b> what makes up the %s that ran through the 2770-series '
      '(&ldquo;Unclassified&rdquo;) in %d? The state&rsquo;s own name for the account is '
      '<i>&ldquo;Unclassified (specify)&rdquo;</i> — everything in it has a real source that was not '
      'coded. The itemisation is one general-ledger query away.</p>') % (money0(catch_total), LATEST)
h += ('<table><thead><tr><th>Account</th><th class="r">%d</th><th class="r">Prior-year median</th>'
      '<th class="r">Multiple</th></tr></thead><tbody>') % LATEST
for c in catchalls:
    mult = ('%.1f&times;' % (c["latest"] / c["med"])) if c["med"] else "—"
    h += ('<tr><td>%s <span class="fnt num">%s</span>%s</td><td class="r num">%s</td>'
          '<td class="r num">%s</td><td class="r num"><b>%s</b></td></tr>'
          % (esc(c["narr"]), c["code"],
             ' <span class="pill">SINCE %d</span>' % c["first"] if c["first"] > YEARS[0] else '',
             money0(c["latest"]), money0(c["med"]) if c["med"] else "—", mult))
h += '</tbody></table>'

# --- 3. accounts off their history ---
h += '<h2><span class="no">03</span>Accounts far off their own thirty-year history</h2>'
h += ('<p class="q"><b>The question:</b> which of these are one-time events, and which are the new '
      'normal? Each account below is at least 3&times; its own prior-year median and at least $50K. '
      'Capital-fund accounts (H-prefix) are excluded — one-time by design, and covered by the capital '
      'projects section of the ledger. Every account over the threshold is listed — nothing is '
      'truncated.</p>')
h += ('<table><thead><tr><th>Account</th><th>Category</th><th class="r">%d</th>'
      '<th class="r">Median</th><th class="r">Multiple</th></tr></thead><tbody>') % LATEST
for x in spikes:
    h += ('<tr><td>%s <span class="fnt num">%s</span></td><td class="mut">%s %s</td>'
          '<td class="r num">%s</td><td class="r num">%s</td><td class="r num"><b>%.1f&times;</b></td></tr>'
          % (esc(x["narr"]), x["code"], "Rev" if x["sec"] == 0 else "Exp", esc(x["l1"][:26]),
             money0(x["latest"]), money0(x["med"]), x["ratio"]))
for x in newcomers:
    h += ('<tr><td>%s <span class="fnt num">%s</span><span class="pill">NEW</span></td>'
          '<td class="mut">%s %s</td><td class="r num">%s</td><td class="r num">—</td>'
          '<td class="r num"><b>first year</b></td></tr>'
          % (esc(x["narr"]), x["code"], "Rev" if x["sec"] == 0 else "Exp", esc(x["l1"][:26]),
             money0(x["latest"])))
h += '</tbody></table>'

# --- 4. vendor masters ---
h += '<h2><span class="no">04</span>One payee, several vendor records</h2>'
h += ('<p class="q"><b>The question:</b> can these be merged? Duplicate vendor master records are a '
      'textbook accounts-payable control gap — the duplicate-invoice check works <i>within</i> a vendor '
      'record, so each extra record is a blind spot. No duplicate payments were found in this register; '
      'the exposure is the control, not a loss.</p>')
h += '<table><thead><tr><th>Payee</th><th>Vendor codes</th><th class="r">Combined</th></tr></thead><tbody>'
for x in hygiene:
    h += ('<tr><td>%s</td><td class="num mut">%s</td><td class="r num">%s</td></tr>'
          % (esc(V[x["v"]]), "  ".join(x["codes"]), money0(x["sum"])))
h += '</tbody></table>'

# --- 5. sprawl ---
h += '<h2><span class="no">05</span>Aggregate purchasing the ledger cannot see</h2>'
h += ('<p class="q"><b>The question:</b> should any of these be on a contract? Nobody approved these '
      'aggregates — they accreted, one small purchase at a time, across so many charge accounts that no '
      'view in the city&rsquo;s own system adds them up. Aggregate vendor spend is the first sheet a '
      'procurement review builds.</p>')
h += ('<table><thead><tr><th>Vendor</th><th class="r">Charge accounts</th><th class="r">Purchases</th>'
      '<th class="r">Two-year total</th></tr></thead><tbody>')
for x in sprawl_top:
    h += ('<tr><td>%s</td><td class="r num">%d</td><td class="r num">%d</td>'
          '<td class="r num">%s</td></tr>'
          % (esc(x["name"]), x["accts"], x["n"], money0(x["sum"])))
h += '</tbody></table>'

# --- 6. first-time payees ---
h += '<h2><span class="no">06</span>Large first-time payees</h2>'
h += ('<p class="q"><b>The question:</b> routine onboarding checks only — new vendor, real services, '
      'documented award? A payee&rsquo;s first-ever payment being large is the single most routine '
      'audit check there is; the biggest entry here is the Memorial Pool contractor, which is exactly '
      'how it should look.</p>')
h += ('<table><thead><tr><th>Payee</th><th>For</th><th>First appears</th>'
      '<th class="r">First-appearance total</th></tr></thead><tbody>')
for x in firsts:
    h += ('<tr><td>%s</td><td class="mut">%s</td><td class="num mut">%s</td>'
          '<td class="r num">%s</td></tr>'
          % (esc(x["name"]), esc(x["ctx"]), esc(x["doc"]["report_date"]), money0(x["amt"])))
h += '</tbody></table>'

h += ('<p class="note"><b>Method.</b> Generated automatically by '
      '<a href="https://jcurry44.github.io/public-ledger/">Public Ledger</a> from the City of North '
      'Tonawanda&rsquo;s published Warrant of Claims (%d parsed warrants, reconciled exactly to the '
      'control totals printed on each document) and its annual filings to the NYS Comptroller '
      '(%d&ndash;%d, self-reported). Thresholds: 3&times; an account&rsquo;s own prior-year median and '
      '$50K minimum; first-time payees measured only where at least ten prior warrants exist. '
      'Approvals and filings as published, not audited actuals. This sample was prepared from public '
      'records and was not requested by or produced for the City.</p>'
      % (len(docs), YEARS[0], LATEST))
h = h.replace('<table>', '<div class="tw"><table>').replace('</table>', '</table></div>')
h += '</div></body></html>'

path = os.path.join(ROOT, "audit.html")
with open(path, "w", encoding="utf-8") as f:
    f.write(h)
print("wrote %s (%.0f KB) — %d flags: %d scans/dupes, %d catch-alls, %d spikes, "
      "%d new, %d vendor-dupes, %d sprawl, %d first-timers"
      % (path, os.path.getsize(path) / 1024, n_flags,
         len(scans) + len(W.get("superseded", [])), len(catchalls), len(spikes),
         len(newcomers), len(hygiene), len(sprawl_top), len(firsts)))
