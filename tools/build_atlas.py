"""The County Atlas: every general-purpose government in Niagara County -
3 cities, 12 towns, 5 villages - each profiled from its own annual filings
to the NYS Comptroller. Emits atlas.html.

Honesty rules carried over: figures as filed, no interpolation, and every
missing filing year is NAMED on the card rather than smoothed over.
Outside the build.py chain; refresh the class zips then rerun.
"""
import csv
import io
import json
import os
import zipfile
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEGMENT_MAP = {"REVENUES": "REVENUE", "EXPENDITURES": "EXPENDITURE"}
CLASSES = [("city", "City"), ("town", "Town"), ("village", "Village")]


def section_of(row):
    if "ACCOUNT_CODE_SECTION" in row:
        return row["ACCOUNT_CODE_SECTION"]
    return SEGMENT_MAP.get(row.get("FINANCIAL_STATEMENT_SEGMENT", ""), "")


def esc(t):
    return (t or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


munis = {}          # name -> {cls, series:{yr:{rev,exp}}, cats:{label:amt} latest}
rows_read = 0

for cls, csvtag in CLASSES:
    z = zipfile.ZipFile(os.path.join(ROOT, "data", "osc", cls + "_all_years.zip"))
    for name in sorted(n for n in z.namelist() if n.endswith("_%s.csv" % csvtag)):
        yr = int(name.split("_")[0])
        rd = csv.DictReader(io.StringIO(z.read(name).decode("utf-8", errors="replace")))
        for r in rd:
            if (r.get("COUNTY") or "") != "Niagara":
                continue
            sec = section_of(r)
            if sec not in ("REVENUE", "EXPENDITURE"):
                continue
            ent = r["ENTITY_NAME"]
            m = munis.setdefault(ent, {"cls": cls, "series": {}, "catyear": 0, "cats": {}})
            yy = m["series"].setdefault(yr, {"rev": 0.0, "exp": 0.0})
            amt = float(r["AMOUNT"] or 0)
            rows_read += 1
            if sec == "REVENUE":
                yy["rev"] += amt
            else:
                yy["exp"] += amt
                if yr > m["catyear"]:
                    m["catyear"] = yr
                    m["cats"] = {}
                if yr == m["catyear"]:
                    k = (r.get("LEVEL_1_CATEGORY") or "Unclassified").title()
                    m["cats"][k] = m["cats"].get(k, 0) + amt

assert len(munis) == 20, "expected 20 general-purpose governments, found %d" % len(munis)

ALL_YEARS = sorted({y for m in munis.values() for y in m["series"]})
Y0, Y1 = ALL_YEARS[0], ALL_YEARS[-1]


def spark_dual(m):
    yrs = list(range(Y0, Y1 + 1))
    W, H = 220, 40
    vals = {"rev": [], "exp": []}
    for y in yrs:
        s = m["series"].get(y)
        vals["rev"].append(s["rev"] if s else None)
        vals["exp"].append(s["exp"] if s else None)
    mx = max(v for k in vals for v in vals[k] if v is not None) or 1
    out = []
    for k, color in (("exp", "--exp"), ("rev", "--rev")):
        d, pen = [], False
        for i, v in enumerate(vals[k]):
            if v is None:                      # a missing filing breaks the line
                pen = False
                continue
            x = W * i / (len(yrs) - 1)
            y = H - 3 - (H - 8) * (v / mx)
            d.append("%s%.1f %.1f" % ("L" if pen else "M", x, y))
            pen = True
        out.append('<path d="%s" fill="none" stroke="var(%s)" stroke-width="1.5" '
                   'vector-effect="non-scaling-stroke"/>' % (" ".join(d), color))
    return ('<svg viewBox="0 0 %d %d" preserveAspectRatio="none">%s</svg>'
            % (W, H, "".join(out)))


import re as _re


def slug(name, cls):
    short = name.replace("City of ", "").replace("Town of ", "").replace("Village of ", "")
    return cls + "-" + _re.sub(r"[^a-z0-9]+", "-", short.lower()).strip("-")


def card(name, m):
    short = name.replace("City of ", "").replace("Town of ", "").replace("Village of ", "")
    yrs = sorted(m["series"])
    latest = yrs[-1]
    s = m["series"][latest]
    net = s["rev"] - s["exp"]
    have = set(yrs)
    gaps = [y for y in range(yrs[0], yrs[-1] + 1) if y not in have]
    filing = "filed %d of %d years since %d" % (len(yrs), yrs[-1] - yrs[0] + 1, yrs[0])
    if gaps:
        gtxt = ", ".join(str(g) for g in gaps[:6]) + (" …" if len(gaps) > 6 else "")
        filing += ' · <span class="gap">missing %s</span>' % gtxt
    else:
        filing += " · no gaps"
    top = sorted(m["cats"].items(), key=lambda x: -x[1])[:1]
    topline = ""
    if top and s["exp"]:
        topline = ('<div class="topcat">Biggest spend: %s · <span class="num">%.0f%%</span></div>'
                   % (esc(top[0][0]), top[0][1] / s["exp"] * 100))
    return ('<a class="mcard" href="m/%s.html">'
            '<div class="mhead"><span class="mname">%s</span>'
            '<span class="clsch">%s</span></div>'
            '<div class="mrow"><span>Revenue · %d</span><span class="num">$%s</span></div>'
            '<div class="mrow"><span>Expenditure</span><span class="num">$%s</span></div>'
            '<div class="mrow mnet"><span>Net</span><span class="num" style="color:%s">%s$%s</span></div>'
            '%s'
            '<div class="mspark">%s</div>'
            '<div class="mfile">%s</div>'
            '<div class="mopen">Open its ledger &rarr;</div>'
            '</a>'
            % (slug(name, m["cls"]), esc(short), m["cls"].upper(), latest,
               "{:,.0f}".format(s["rev"]), "{:,.0f}".format(s["exp"]),
               "var(--bad)" if net < 0 else "var(--ok)",
               "−" if net < 0 else "+", "{:,.0f}".format(abs(net)),
               topline, spark_dual(m), filing))


order = {"city": 0, "town": 1, "village": 2}
entries = sorted(munis.items(),
                 key=lambda kv: (order[kv[1]["cls"]],
                                 -kv[1]["series"][sorted(kv[1]["series"])[-1]]["exp"]))
CARDS = "".join(card(n, m) for n, m in entries)
total_gaps = sum(1 for n, m in munis.items()
                 for y in range(sorted(m["series"])[0], sorted(m["series"])[-1] + 1)
                 if y not in m["series"])

HTML = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Public Ledger — County Atlas — every government in Niagara County</title>
<script>try{var t=localStorage.getItem("pl-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
<style>
@font-face{font-family:'Fraunces';font-style:normal;font-weight:600;font-display:swap;
  src:url(fonts/Fraunces-600-latin.woff2) format('woff2')}
:root{--paper:#f6f4ef;--card:#fffdfa;--ink:#16181d;--muted:#6c7079;--faint:#93979f;
  --rule:#e0dbd0;--rule-strong:#cdc6b7;--accent:#1b3a5c;--accent-soft:#e7ecf2;
  --rev:#3d7ebf;--exp:#c07a24;--ok:#1c6b47;--ok-soft:#e3f0e9;--bad:#9e2b28;--warn:#8f5c10;
  --gridline:#e6e1d6;--desk:#e9e3d5}
:root[data-theme="dark"]{--paper:#14171c;--card:#191d23;--ink:#e8e6df;--muted:#a6aab2;
  --faint:#787d86;--rule:#262b33;--rule-strong:#343b45;--accent:#a9c3e2;--accent-soft:#1f2733;
  --rev:#4a8cc4;--exp:#b8822f;--ok:#4cc38a;--ok-soft:#132a20;--bad:#ff7a76;--warn:#d9a552;
  --gridline:#232a31;--desk:#0a0c0f}
*{box-sizing:border-box}
html{border-top:5px solid var(--accent);background:var(--desk);-webkit-tap-highlight-color:transparent}
body{margin:0;background:var(--desk);color:var(--ink);
  font:14px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.num{font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
a{color:var(--accent);text-underline-offset:2.5px}
.page{max-width:1060px;margin:26px auto 60px;padding:30px 34px 44px;background:var(--paper);
  border-radius:3px;box-shadow:0 0 0 1px var(--rule-strong),0 26px 70px -32px rgba(20,18,10,.45)}
@media (max-width:700px){.page{margin:0;border-radius:0;box-shadow:none;padding:20px 16px 40px}}
.mast{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;border-bottom:3px double var(--rule-strong);padding-bottom:12px}
.mark{font:600 25px/1 'Fraunces',ui-serif,Georgia,serif}.mark span{color:var(--accent)}
.mark a{color:inherit;text-decoration:none}
.edition{font:700 9.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;color:var(--exp);
  border:1.5px solid var(--exp);border-radius:4px;padding:4px 7px}
.meta{margin-left:auto;font-size:12px;color:var(--faint)}
@media (max-width:700px){.meta{margin-left:0}}
h1{font:600 27px/1.2 'Fraunces',ui-serif,Georgia,serif;margin:20px 0 6px}
.lede{color:var(--muted);font-size:14px;max-width:80ch;margin:0 0 8px}
.lede b{color:var(--ink)}
.gateline{font-size:12.5px;background:var(--ok-soft);color:var(--ok);border:1px solid
  color-mix(in srgb,var(--ok) 35%,transparent);border-radius:8px;padding:9px 13px;margin:12px 0 20px;
  display:inline-block}
h2{font:600 11px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);
  margin:24px 0 12px;display:flex;gap:12px;align-items:center}
h2::after{content:'';flex:1;height:1px;background:var(--rule)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:13px}
a.mcard{text-decoration:none;color:inherit;display:block}
a.mcard:hover{border-color:var(--accent)}
a.mcard:hover .mopen{text-decoration:underline}
.mopen{font-size:11.5px;font-weight:600;color:var(--accent);margin-top:7px}
.mcard{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:13px 14px 11px;
  box-shadow:0 1px 2px rgba(20,22,26,.05),0 8px 24px -12px rgba(20,22,26,.14)}
.mhead{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.mname{font:600 15.5px/1.2 'Fraunces',ui-serif,Georgia,serif}
.clsch{font-size:9px;font-weight:700;letter-spacing:.08em;border-radius:4px;
  padding:2px 5px;background:var(--accent-soft);color:var(--accent);margin-left:auto}
.mrow{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--muted);padding:1.5px 0}
.mrow .num{color:var(--ink)}
.mrow.mnet{border-top:1px solid var(--rule);margin-top:3px;padding-top:4px}
.topcat{font-size:11px;color:var(--faint);margin:6px 0 0}
.mspark{margin:8px 0 4px}
.mspark svg{display:block;width:100%;height:40px}
.mfile{font-size:10.5px;color:var(--faint)}
.mfile .gap{color:var(--warn);font-weight:600}
.legend{display:flex;gap:16px;font-size:12px;color:var(--muted);margin:0 0 14px}
.legend b{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.countycard{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--rule-strong);
  border-radius:10px;padding:14px 16px;margin:0 0 18px;flex-wrap:wrap}
.countycard b{font:600 16px/1 'Fraunces',ui-serif,Georgia,serif}
.countycard a{margin-left:auto}
.foot{border-top:1px solid var(--rule);margin-top:30px;padding-top:14px;font-size:12px;color:var(--faint)}
.foot p{margin:0 0 7px;max-width:88ch}
</style></head><body>
<div class="page">
  <div class="mast">
    <div class="mark"><a href="./">Public <span>Ledger</span></a></div>
    <span class="edition">COUNTY ATLAS</span>
    <div class="meta">Niagara County · every general-purpose government · filings __Y0__–__Y1__</div>
  </div>
  <h1>Every government in Niagara County</h1>
  <p class="lede"><b>Twenty-one governments tax and spend inside this county — and every one now has
    its own ledger.</b> Select any card to open that government&rsquo;s full page: the drillable
    year panels, the scrubbable trend, the compare-years view, its share of the county sales tax.
    Each is built from its own annual filings to the NYS Comptroller, on the same method as every other page of Public Ledger: as filed,
    desk-reviewed but not audited, no interpolation, and <b>every missing year named</b> — a broken
    line in a chart below is a filing that does not exist, not a smoothing choice.</p>
  <div class="gateline num">&#10003; 20 governments · __NROWS__ account-level rows read · __GAPS__ missing
    filing-years named, none interpolated</div>

  <div class="countycard"><b>Niagara County</b>
    <span class="num" style="color:var(--muted)">$569.1M revenue · $557.4M expenditure · 2025</span>
    <a href="county.html">the full County Edition &rarr;</a></div>

  <div class="legend"><span><b style="background:var(--rev)"></b>Revenue</span>
    <span><b style="background:var(--exp)"></b>Expenditure</span></div>
  <div class="grid">
__CARDS__
  </div>

  <div class="foot">
    <p><b>Method.</b> Parsed from the NYS Comptroller&rsquo;s statewide class files (cities, towns,
      villages), joined on county, flows only. Self-reported AFR data. Each card&rsquo;s figures are
      that government&rsquo;s latest filing; sparklines span __Y0__–__Y1__ at each government&rsquo;s
      own scale.</p>
    <p>Companions: <a href="./">the City of North Tonawanda edition</a> (reconciled warrant register,
      briefs, exception report) · <a href="county.html">the County Edition</a> (drill-downs,
      budget vs actual, the shared sales tax).</p>
  </div>
</div>
</body></html>"""

out = (HTML
       .replace("__Y0__", str(Y0)).replace("__Y1__", str(Y1))
       .replace("__NROWS__", "{:,}".format(rows_read))
       .replace("__GAPS__", str(total_gaps))
       .replace("__CARDS__", CARDS))
path = os.path.join(ROOT, "atlas.html")
open(path, "w", encoding="utf-8").write(out)
print("wrote %s (%.0f KB) - %d munis, %s rows, %d named gaps, years %d-%d"
      % (path, os.path.getsize(path) / 1024, len(munis), "{:,}".format(rows_read),
         total_gaps, Y0, Y1))
