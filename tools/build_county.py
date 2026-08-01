"""The County Edition, full-featured: Niagara County's 31 years of filings
with the city page's entire interaction language - the three-tab category
modal (cross-filtered breakdown, anomaly-marked trend with year
decomposition, composition sparklines), per-account 31-year histories, the
compare-two-years modal, a scrubbable trend that drives the year panels,
the peers metric toggle, nav rail + pager, and the method set in ink.

Same parser discipline as build_osc.py: schema break resolved by column
name per era, joined on MUNICIPAL_CODE never ENTITY_NAME, flows only.
Emits county.html. Not in the build.py chain - county data updates
annually; refresh data/osc/county_all_years.zip then rerun this.
"""
import csv
import io
import json
import os
import re
import subprocess
import urllib.request
import zipfile
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = os.path.join(ROOT, "data", "osc", "county_all_years.zip")
NC = "290100000000"                     # County of Niagara - pinned by code
FLOWS = ("REVENUE", "EXPENDITURE")
SEGMENT_MAP = {"REVENUES": "REVENUE", "EXPENDITURES": "EXPENDITURE"}
SCHEMA_BREAK = 2013

# 2020 Census (P1) populations; WNY ring plus the closest upstate matches.
PEERS = {
    "County of Niagara": 212666,
    "County of Erie": 954236,
    "County of Chautauqua": 127657,
    "County of Cattaraugus": 77042,
    "County of Genesee": 58388,
    "County of Orleans": 40343,
    "County of Oneida": 232125,
    "County of Broome": 198683,
    "County of Saratoga": 235509,
}

z = zipfile.ZipFile(ZIP)
years_files = sorted(n for n in z.namelist() if n.endswith("_County.csv"))


def section_of(row):
    if "ACCOUNT_CODE_SECTION" in row:
        return row["ACCOUNT_CODE_SECTION"]
    return SEGMENT_MAP.get(row.get("FINANCIAL_STATEMENT_SEGMENT", ""), "")


SMALL = {"and", "of", "for", "the", "to", "in", "on", "or", "a"}


def title_label(s):
    if not s:
        return s
    words = (s.title() if s == s.upper() else s).split()
    return " ".join(w if i == 0 or w.lower() not in SMALL else w.lower()
                    for i, w in enumerate(words))


# dictionary-encoded flows, same field order as the city payload so the
# ported drill code reads them unchanged:
#   [yr, sec, l1, l2, obj, narr, acct, amt]
dicts = {"l1": [], "l2": [], "obj": [], "narr": []}
didx = {k: {} for k in dicts}


def di(kind, val):
    val = title_label((val or "").strip()) or "Unclassified"
    m = didx[kind]
    if val not in m:
        m[val] = len(dicts[kind])
        dicts[kind].append(val)
    return m[val]


series, flows = {}, []
dist_series = {}                       # yr -> A19854 Distribution of Sales Tax
cats = {"REVENUE": {}, "EXPENDITURE": {}}
peer_tot = defaultdict(lambda: defaultdict(float))
latest = None

for name in years_files:
    yr = int(name.split("_")[0])
    rd = csv.DictReader(io.StringIO(z.read(name).decode("utf-8", errors="replace")))
    tot = defaultdict(float)
    bycat = {"REVENUE": defaultdict(float), "EXPENDITURE": defaultdict(float)}
    found = False
    for r in rd:
        sec = section_of(r)
        if sec not in FLOWS:
            continue
        ent = r.get("ENTITY_NAME", "")
        amt = float(r["AMOUNT"] or 0)
        if ent in PEERS:
            peer_tot[yr][ent + "|" + sec] += amt
            if sec == "REVENUE" and (r.get("LEVEL_1_CATEGORY") or "").upper().startswith("REAL PROPERTY TAX"):
                peer_tot[yr][ent + "|TAX"] += amt
        if r["MUNICIPAL_CODE"] != NC:
            continue
        found = True
        tot[sec] += amt
        if sec == "EXPENDITURE" and (r.get("ACCOUNT_CODE") or "").strip().startswith("A19854"):
            dist_series[yr] = dist_series.get(yr, 0) + amt
        bycat[sec][title_label(r.get("LEVEL_1_CATEGORY") or "Unclassified")] += amt
        flows.append([
            yr, 0 if sec == "REVENUE" else 1,
            di("l1", r.get("LEVEL_1_CATEGORY")),
            di("l2", r.get("LEVEL_2_CATEGORY")),
            di("obj", r.get("OBJECT_OF_EXPENDITURE")),
            di("narr", r.get("ACCOUNT_CODE_NARRATIVE")),
            (r.get("ACCOUNT_CODE") or "").strip(),
            round(amt, 2),
        ])
    if not found:
        continue
    series[yr] = {"rev": round(tot["REVENUE"], 2), "exp": round(tot["EXPENDITURE"], 2)}
    for sec in FLOWS:
        cats[sec][yr] = {k: round(v, 2) for k, v in bycat[sec].items()}
    latest = yr if latest is None else max(latest, yr)

yrs = sorted(series)
assert yrs and yrs[0] == 1995, "county series no longer starts at 1995"
assert yrs == list(range(yrs[0], yrs[-1] + 1)), "gap in county year coverage"
for y in yrs:
    assert series[y]["rev"] > 100_000_000 and series[y]["exp"] > 100_000_000, \
        "year %d implausibly small - schema drift?" % y

peer_year = None
for y in range(latest, yrs[0], -1):
    if all(peer_tot[y].get(n + "|REVENUE", 0) > 10_000_000 and
           peer_tot[y].get(n + "|EXPENDITURE", 0) > 10_000_000 for n in PEERS):
        peer_year = y
        break
assert peer_year, "no common peer year"
peers = [{
    "name": n.replace("County of ", ""),
    "pop": PEERS[n],
    "rev": round(peer_tot[peer_year][n + "|REVENUE"], 2),
    "exp": round(peer_tot[peer_year][n + "|EXPENDITURE"], 2),
    "tax": round(peer_tot[peer_year].get(n + "|TAX", 0), 2),
    "self": n == "County of Niagara",
} for n in PEERS]


def recipients_for(yr):
    """Every Niagara County city/town/village's A1120-family receipts (the
    'Non Property Tax Distribution by County' account) for one year, read
    from each government's OWN filing. Niagara Falls' separately-imposed
    city sales tax is captured alongside, never mixed in."""
    out, nf_own = [], 0.0
    for cls, inner in (("city", "%d_City.csv" % yr), ("town", "%d_Town.csv" % yr),
                       ("village", "%d_Village.csv" % yr)):
        zc = zipfile.ZipFile(os.path.join(ROOT, "data", "osc", cls + "_all_years.zip"))
        if inner not in zc.namelist():
            return None, 0.0
        rd = csv.DictReader(io.StringIO(zc.read(inner).decode("utf-8", errors="replace")))
        per = {}
        for r in rd:
            if (r.get("COUNTY") or "") != "Niagara":
                continue
            if r.get("ACCOUNT_CODE_SECTION") != "REVENUE":
                continue
            code = (r.get("ACCOUNT_CODE") or "").strip()
            narr = (r.get("ACCOUNT_CODE_NARRATIVE") or "").upper()
            amt = float(r["AMOUNT"] or 0)
            ent = r["ENTITY_NAME"]
            if code.startswith("A1120") or "NON PROPERTY TAX" in narr:
                per[ent] = per.get(ent, 0) + amt
            elif "SALES" in narr and "TAX" in narr and "Niagara Falls" in ent:
                nf_own += amt
        for ent, amt in per.items():
            out.append({"name": ent.replace("City of ", "").replace("Town of ", "")
                        .replace("Village of ", ""), "cls": cls, "amt": round(amt, 2)})
    out.sort(key=lambda x: -x["amt"])
    return out, round(nf_own, 2)


# latest year where the recipients' own filings substantially cover the
# county's line - partially-filed years fall through to the prior one
shared_year, recips, nf_own = None, None, 0.0
for y in range(latest, latest - 4, -1):
    if dist_series.get(y, 0) <= 0:
        continue
    rr, nfo = recipients_for(y)
    if rr and sum(x["amt"] for x in rr) >= 0.9 * dist_series[y]:
        shared_year, recips, nf_own = y, rr, nfo
        break
assert shared_year, "no year where recipient filings cover the county line"
recip_sum = round(sum(x["amt"] for x in recips), 2)
county_line = round(dist_series[shared_year], 2)
gap_pct = abs(recip_sum - county_line) / county_line * 100


def spark_path(vals, W=260, H=44):
    mx = max(vals) or 1
    pts = []
    for i, v in enumerate(vals):
        pts.append("%s%.1f %.1f" % ("L" if i else "M",
                   W * i / (len(vals) - 1), H - 3 - (H - 8) * (v / mx)))
    return " ".join(pts)


# ---------------------------------------------------------------- the budget
BUDGET_PDF = os.path.join(ROOT, "data", "budget", "2025_Adopted_Budget_Book_1_Final.pdf")
BUDGET_URL = ("https://downloads.niagaracounty.gov/Document_center/Department/A%20-F/"
              "Budget/Budget%20Books/2025_Adopted_Budget_Book_1_Final.pdf")
BUDGET_YEAR = 2025


def esc(t):
    return (t or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

if not os.path.exists(BUDGET_PDF):
    os.makedirs(os.path.dirname(BUDGET_PDF), exist_ok=True)
    req = urllib.request.Request(BUDGET_URL, headers={"User-Agent": "Mozilla/5.0"})
    open(BUDGET_PDF, "wb").write(urllib.request.urlopen(req, timeout=300).read())


def _page(n):
    r = subprocess.run(["pdftotext", "-f", str(n), "-l", str(n), "-table",
                        BUDGET_PDF, "-"], capture_output=True, text=True)
    return r.stdout


def _num(tok):
    return float(tok.replace(",", ""))


# Page 23: the A fund by NYS chart-of-accounts root, plus the other budgeted
# funds. First numeric column is appropriations.
p23 = _page(23)
budget_roots, budget_funds = [], []
for line in p23.splitlines():
    m = re.match(r"\s*(A\d{4})\s+(.+?)\s{2,}([\d,]+)(?:\s|$)", line)
    if m:
        budget_roots.append({"root": m.group(1), "name": m.group(2).strip(),
                             "approp": _num(m.group(3))})
        continue
    m = re.match(r"\s*(CM|CD|D|DM) Fund\s+(.+?)\s{2,}([\d,]+)(?:\s|$)", line)
    if m:
        budget_funds.append({"pfx": m.group(1), "name": m.group(2).strip(),
                             "approp": _num(m.group(3))})
mA = re.search(r"Total breakdown of A Fund\s+([\d,]+)", p23)
mAll = re.search(r"Total All Funds w/o Districts\s+([\d,]+)", p23)
assert mA and mAll, "budget page 23 anchors missing - book layout changed?"
A_PRINTED, ALL_PRINTED = _num(mA.group(1)), _num(mAll.group(1))

# GATE: the parsed rows must re-add to the book's own printed totals exactly.
root_sum = sum(r["approp"] for r in budget_roots)
assert abs(root_sum - A_PRINTED) < 0.5, \
    "A-fund roots sum %.0f != printed %.0f" % (root_sum, A_PRINTED)
fund_sum = root_sum + sum(f["approp"] for f in budget_funds)
assert abs(fund_sum - ALL_PRINTED) < 0.5, \
    "fund sum %.0f != printed %.0f" % (fund_sum, ALL_PRINTED)

# Page 22: districts too (refuse/water/sewer), for the fund-level view.
p22 = _page(22)
district_rows = []
for label, pfx in (("Refuse District", "S"), ("Water District", "FX"), ("Sewer District", "G")):
    m = re.search(re.escape(label) + r"\s+([\d,]+)\s+([\d,]+)", p22)
    if m:
        district_rows.append({"pfx": pfx, "name": label, "approp": _num(m.group(1))})
mTot = re.search(r"Totals\s+([\d,]+)\s+([\d,]+)", p22)
assert mTot, "budget page 22 totals missing"
GRAND_PRINTED = _num(mTot.group(1))
assert abs(ALL_PRINTED + sum(d["approp"] for d in district_rows) - GRAND_PRINTED) < 0.5, \
    "page-22 grand total does not reconcile with page-23 funds + districts"

# ---- the actual side, same year, same shapes ----
def root_of(num):
    fn = num // 10                      # A3120.2 -> function 3120, object 2
    if fn < 2000:
        return "A%d" % ((fn // 100) * 100)
    if fn < 9000:
        return "A%d" % ((fn // 1000) * 1000)
    if fn < 9700:
        return "A9000"
    if fn < 9900:
        return "A9700"
    return "A9900"


actual_roots, actual_funds = {}, {}
for f in flows:
    if f[0] != BUDGET_YEAR or f[1] != 1:
        continue
    m = re.match(r"([A-Z]+)(\d+)", f[6])
    if not m:
        continue
    pfx, num = m.group(1), int(m.group(2))
    actual_funds[pfx] = actual_funds.get(pfx, 0) + f[7]
    if pfx == "A":
        r = root_of(num)
        actual_roots[r] = actual_roots.get(r, 0) + f[7]

BUDGET_FUND_MAP = [("General (A)", "A", A_PRINTED)] + \
    [(f["name"] + " (" + f["pfx"] + ")", f["pfx"], f["approp"]) for f in budget_funds] + \
    [(d["name"] + " (" + d["pfx"] + ")", d["pfx"], d["approp"]) for d in district_rows]
UNBUDGETED = sorted((k, v) for k, v in actual_funds.items()
                    if k not in {x[1] for x in BUDGET_FUND_MAP})


def all_cats(sec, yr):
    return [[k, v] for k, v in sorted(cats[sec][yr].items(), key=lambda x: -x[1])]


payload = {
    "years": yrs,
    "rev": [series[y]["rev"] for y in yrs],
    "exp": [series[y]["exp"] for y in yrs],
    "latest": latest,
    "revByYear": {str(y): all_cats("REVENUE", y) for y in yrs},
    "expByYear": {str(y): all_cats("EXPENDITURE", y) for y in yrs},
    "dict": dicts,
    "flows": flows,
    "schemaBreak": SCHEMA_BREAK,
    "peers": peers,
    "peerYear": peer_year,
}

rl, el = series[latest]["rev"], series[latest]["exp"]
net = rl - el
nt = json.load(open(os.path.join(ROOT, "data", "osc-data.json"), encoding="utf-8"))
nt_rev = nt["rev"][-1]

TEMPLATE = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Public Ledger — County Edition — Niagara County</title>
<script>try{var t=localStorage.getItem("pl-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
<style>
@font-face{font-family:'Fraunces';font-style:normal;font-weight:600;font-display:swap;
  src:url(fonts/Fraunces-600-latin.woff2) format('woff2')}
:root{--paper:#f6f4ef;--card:#fffdfa;--ink:#16181d;--muted:#6c7079;--faint:#93979f;
  --rule:#e0dbd0;--rule-strong:#cdc6b7;--accent:#1b3a5c;--accent-soft:#e7ecf2;
  --rev:#3d7ebf;--exp:#c07a24;--ok:#1c6b47;--ok-soft:#e3f0e9;--bad:#9e2b28;
  --warn:#8f5c10;--warn-soft:#f7eeda;--gridline:#e6e1d6;--desk:#e9e3d5;
  --sch:#3d7ebf;--cty:#c07a24;--cnt:#9a5a86;
  --shadow:0 1px 2px rgba(20,22,26,.05),0 8px 24px -12px rgba(20,22,26,.18)}
:root[data-theme="dark"]{--paper:#14171c;--card:#191d23;--ink:#e8e6df;--muted:#a6aab2;
  --faint:#787d86;--rule:#262b33;--rule-strong:#343b45;--accent:#a9c3e2;--accent-soft:#1f2733;
  --rev:#4a8cc4;--exp:#b8822f;--ok:#4cc38a;--ok-soft:#132a20;--bad:#ff7a76;
  --warn:#d9a552;--warn-soft:#2a2317;--gridline:#232a31;--desk:#0a0c0f;
  --sch:#4a8cc4;--cty:#b8822f;--cnt:#ad6c9e;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px -12px rgba(0,0,0,.6)}
*{box-sizing:border-box}
html{border-top:5px solid var(--accent);background:var(--desk);-webkit-tap-highlight-color:transparent;
  -webkit-text-size-adjust:100%}
body{margin:0;background:var(--desk);color:var(--ink);
  font:14px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.num{font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
::selection{background:color-mix(in srgb,var(--accent) 24%,transparent)}
a{color:var(--accent);text-underline-offset:2.5px;text-decoration-thickness:1px}
button:focus-visible,a:focus-visible,select:focus-visible,[role="button"]:focus-visible,summary:focus-visible{
  outline:2px solid var(--accent);outline-offset:2px}
@media (prefers-reduced-motion:no-preference){
  html{scroll-behavior:smooth}
  .modal .sheet{animation:sheetIn .18s cubic-bezier(.2,.8,.3,1)}
  @keyframes sheetIn{from{opacity:0;transform:translateY(14px) scale(.985)}}
}
.page{max-width:980px;margin:26px auto 60px;padding:0 0 44px;background:var(--paper);
  border-radius:3px;box-shadow:0 0 0 1px var(--rule-strong),0 26px 70px -32px rgba(20,18,10,.45)}
@media (max-width:700px){.page{margin:0;border-radius:0;box-shadow:none}}
.wrap{padding:0 34px}
@media (max-width:700px){.wrap{padding:0 16px}}
.mast{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
  border-bottom:1px solid var(--rule-strong);padding:22px 34px 14px;background:var(--card);
  border-radius:3px 3px 0 0}
@media (max-width:700px){.mast{padding:16px 16px 12px}}
.mark{font:600 25px/1 'Fraunces',ui-serif,Georgia,serif}.mark span{color:var(--accent)}
.mark a{color:inherit;text-decoration:none}
.edition{font:700 9.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;color:var(--exp);
  border:1.5px solid var(--exp);border-radius:4px;padding:4px 7px}
.mast .meta{margin-left:auto;font-size:12px;color:var(--faint);text-align:right}
.mast .meta b{color:var(--muted)}
@media (max-width:700px){.mast .meta{margin-left:0;text-align:left}}
.themebtn{border:1px solid var(--rule-strong);background:transparent;color:var(--muted);border-radius:8px;
  width:29px;height:29px;padding:0;display:inline-flex;align-items:center;justify-content:center;
  cursor:pointer;vertical-align:middle}
.themebtn svg{width:14px;height:14px}
.rail{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--paper) 88%,transparent);
  backdrop-filter:blur(8px);border-bottom:1px solid var(--rule)}
.rail-in{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;padding:0 26px}
@media (max-width:700px){.rail-in{padding:0 8px}}
.rail-in::-webkit-scrollbar{display:none}
.rail a{padding:12px 14px;font-size:13px;color:var(--muted);text-decoration:none;white-space:nowrap;
  border-bottom:2px solid transparent}
.rail a:hover{color:var(--ink)}
.rail a.on{color:var(--ink);border-bottom-color:var(--accent);font-weight:600}
section{padding:30px 0 8px;scroll-margin-top:52px}
h1{font:600 29px/1.15 'Fraunces',ui-serif,Georgia,serif;margin:24px 0 6px}
@media (max-width:700px){h1{font-size:24px}}
.lede{color:var(--muted);font-size:14px;max-width:76ch;margin:0 0 16px}
.lede b{color:var(--ink)}
@media (max-width:640px){.lede{font-size:13.5px}}
h2{font:600 11px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);
  margin:26px 0 10px;display:flex;gap:12px;align-items:center}
h2::after{content:'';flex:1;height:1px;background:var(--rule)}
.hcard{background:var(--card);border:1px solid var(--rule-strong);border-radius:12px;
  padding:14px 18px 4px;max-width:560px;box-shadow:var(--shadow)}
.hrow{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:7px 0}
.hrow .k{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);font-weight:600}
.hrow .v{font:600 24px/1 'Fraunces',ui-serif,Georgia,serif}
@media (max-width:420px){.hrow .v{font-size:21px}}
.hrow:nth-child(2){border-bottom:1px solid var(--rule-strong);padding-bottom:13px}
.hrow:nth-child(3){padding-top:11px}
.hrow .v.closed{border-bottom:3px double var(--rule-strong);padding-bottom:5px}
#hRev .v{color:var(--rev)} #hExp .v{color:var(--exp)}
.hfoot{margin:8px -18px 0;border-top:1px solid var(--rule);padding:9px 18px;font-size:12px;color:var(--muted)}
.panel{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:15px 16px;box-shadow:var(--shadow)}
.panel h3{margin:0 0 2px;font-size:14.5px}
.panel h3 .tot{float:right;font-weight:600}
.panel .sub{color:var(--muted);font-size:12px;margin:0 0 10px}
.chartwrap{position:relative;overflow:hidden}
svg.trend{display:block;width:100%;height:auto;overflow:visible}
svg.trend .gl{stroke:var(--gridline);stroke-width:1}
svg.trend .ln{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
svg.trend .ax{fill:var(--faint);font-size:10.5px;font-family:ui-monospace,Menlo,Consolas,monospace}
svg.trend .brk{stroke:var(--rule-strong);stroke-width:1;stroke-dasharray:3 3}
svg.trend .sel{stroke:var(--accent);stroke-width:1.5;opacity:.55}
svg.trend .dot{stroke:var(--card);stroke-width:2}
.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);margin:2px 0 10px}
.legend b{display:inline-block;width:11px;height:11px;border-radius:3px;vertical-align:-1px;margin-right:6px}
.tip{position:absolute;pointer-events:none;background:var(--card);border:1px solid var(--rule-strong);
  border-radius:7px;padding:7px 10px;font-size:12.5px;box-shadow:var(--shadow);opacity:0;transition:opacity .1s;z-index:5;white-space:nowrap}
.tip .ty{font-weight:600;margin-bottom:3px}
.tip .tl{display:flex;justify-content:space-between;gap:14px}
.tip .tl b{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px}
.note{font-size:12px;color:var(--faint);margin-top:9px;padding-left:11px;border-left:2px solid var(--rule-strong);max-width:86ch}
.years{display:flex;gap:5px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:thin}
.years::-webkit-scrollbar{height:5px}
.years::-webkit-scrollbar-thumb{background:var(--rule-strong);border-radius:3px}
.yp{flex:0 0 auto;border:1px solid var(--rule-strong);background:var(--card);color:var(--muted);
  border-radius:99px;padding:5px 11px;font:600 12px/1 ui-monospace,Menlo,Consolas,monospace;cursor:pointer;
  transition:background .12s,color .12s,border-color .12s}
.yp:hover{color:var(--ink);border-color:var(--accent)}
.yp.on{background:var(--accent);border-color:var(--accent);color:var(--paper)}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:760px){.pair{grid-template-columns:1fr}}
.rank{display:flex;flex-direction:column;gap:9px}
.rk{display:grid;grid-template-columns:1fr auto;gap:3px 10px;align-items:baseline;cursor:default}
.rk .lb{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rk .vl{font-size:12.5px;font-weight:600}
.rk .tr{grid-column:1/-1;height:9px;background:var(--gridline);border-radius:2px;overflow:hidden}
.rk .tr i{display:block;height:100%;border-radius:0 4px 4px 0;transition:width .55s cubic-bezier(.25,.9,.3,1)}
.rank.pregrow .rk .tr i{width:0!important}
@media (prefers-reduced-motion:reduce){.rk .tr i{transition:none}}
.rk .pc{font-size:11px;color:var(--faint);grid-column:1/-1;margin-top:-2px}
.rk.can{cursor:pointer;border-radius:6px;margin:0 -7px;padding:3px 7px}
.rk.can:hover{background:var(--accent-soft)}
.rk.can:hover .lb{color:var(--accent)}
.rk.can .lb::after{content:'\2197';color:var(--faint);font-size:11px;margin-left:6px;opacity:0;transition:opacity .12s}
.rk.can:hover .lb::after{opacity:1}
.rk[data-other]:hover{background:var(--accent-soft);border-radius:6px}
.rk .see{color:var(--accent);font-weight:600;font-size:11.5px;white-space:nowrap}
.rk:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.pill{border:1px solid var(--rule-strong);background:transparent;color:var(--muted);border-radius:99px;
  padding:5px 11px;font-size:12px;cursor:pointer}
.pill:hover{color:var(--ink);border-color:var(--accent)}
.seg{display:inline-flex;gap:2px;padding:3px;border-radius:99px;background:color-mix(in srgb,var(--rule) 55%,transparent);margin:0 0 12px}
.seg button{border:0;background:transparent;color:var(--muted);font:600 12px/1 system-ui;
  padding:7px 13px;border-radius:99px;cursor:pointer}
.seg button[aria-selected="true"]{background:var(--card);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.chip-f{display:inline-flex;align-items:center;gap:7px;background:var(--accent-soft);color:var(--accent);
  border:1px solid var(--accent);border-radius:99px;padding:4px 8px 4px 11px;font-size:12px;font-weight:600}
.chip-f button{border:0;background:transparent;color:inherit;cursor:pointer;font-size:13px;line-height:1;padding:0 2px;opacity:.7}
.chip-f button:hover{opacity:1}
.fnt{color:var(--faint);font-size:12px}
.thin{background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn);
  border-radius:8px;padding:9px 12px;font-size:12.5px;margin:0 0 12px}
/* ---------- modal ---------- */
.modal[hidden]{display:none}
.modal{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:22px}
.backdrop{position:absolute;inset:0;background:rgba(12,14,18,.55);backdrop-filter:blur(3px)}
.sheet{position:relative;background:var(--paper);border:1px solid var(--rule-strong);border-radius:14px;
  width:min(900px,100%);max-height:min(86vh,860px);display:flex;flex-direction:column;
  box-shadow:0 24px 70px -20px rgba(0,0,0,.5);overflow:hidden}
.sheet header{display:flex;align-items:flex-start;gap:14px;padding:18px 20px 12px;border-bottom:1px solid var(--rule)}
.eyebrow{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);font-weight:600}
.sheet h3{margin:4px 0 0;font:600 21px/1.2 'Fraunces',ui-serif,Georgia,serif}
.mbig{margin-top:7px;font-size:15px;font-weight:600}
.mbig span{color:var(--muted);font-weight:400;font-size:13px;margin-left:7px}
.xbtn{margin-left:auto;flex:0 0 auto;border:1px solid var(--rule-strong);background:var(--card);color:var(--muted);
  width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:15px;line-height:1}
.xbtn:hover{color:var(--ink);border-color:var(--accent)}
.tabs{display:flex;gap:2px;padding:0 14px;border-bottom:1px solid var(--rule);background:var(--card)}
.tabs button{border:0;background:transparent;color:var(--muted);font:600 13px/1 system-ui;padding:11px 13px;
  cursor:pointer;border-bottom:2px solid transparent}
.tabs button:hover{color:var(--ink)}
.tabs button[aria-selected=true]{color:var(--ink);border-bottom-color:var(--accent)}
.mbody{overflow-y:auto;padding:16px 20px 22px}
.mbody h4{margin:0 0 9px;font:600 11px/1 system-ui;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.mbody h4:not(:first-child){margin-top:20px}
.mstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:6px}
.mstat{background:var(--card);border:1px solid var(--rule);border-radius:9px;padding:10px 12px}
.mstat .k{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--faint)}
.mstat .v{font-size:18px;font-weight:600;margin-top:3px}
.small{display:grid;grid-template-columns:repeat(auto-fit,minmax(198px,1fr));gap:11px}
.sm{background:var(--card);border:1px solid var(--rule);border-radius:9px;padding:10px 11px}
.sm .n{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sm .v{font-size:12.5px;color:var(--muted);margin-top:1px}
.sm svg{display:block;width:100%;height:38px;margin-top:6px;overflow:visible}
@media (max-width:640px){
  .modal{padding:0}
  .sheet{max-height:100vh;height:100%;border-radius:0;border:0;width:100%}
}
.minis{display:flex;flex-direction:column;gap:6px}
.sb{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:12.5px}
.sb .t{grid-column:1/-1;height:6px;background:var(--gridline);border-radius:2px;overflow:hidden}
.sb .t i{display:block;height:100%;border-radius:0 3px 3px 0}
.sb.can{cursor:pointer;border-radius:6px;margin:0 -6px;padding:2px 6px}
.sb.can:hover{background:var(--accent-soft)}
.sb.on>span:first-child{font-weight:700}
.sb .onmark,.sharelegend .onmark{color:var(--ok);font-weight:700}
.sb:focus-visible,.sharelegend .can:focus-visible,.sharebar i:focus-visible{
  outline:2px solid var(--accent);outline-offset:1px}
.tb-bar{display:flex;gap:2px;height:34px;border-radius:7px;overflow:hidden;margin:14px 0 8px}
.tb-bar i{display:block;height:100%}
.sharebar i.on{outline:2px solid var(--ink);outline-offset:-2px}
.sharelegend{display:flex;gap:7px 20px;flex-wrap:wrap;font-size:12.5px;margin:0 0 6px}
.sharelegend b{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.sharelegend .num{color:var(--muted)}
.sharelegend .can{cursor:pointer}
.sharelegend .can:hover{text-decoration:underline}
.sharelegend .on{font-weight:700;color:var(--ink)}
.tailx{margin:2px 0 10px}
.tailx summary{cursor:pointer;font-size:12.5px;color:var(--accent);font-weight:600;
  list-style:none;display:inline-block;padding:2px 0}
.tailx summary::-webkit-details-marker{display:none}
.tailx summary::before{content:'\25B8';margin-right:6px;display:inline-block;transition:transform .12s}
.tailx[open] summary::before{transform:rotate(90deg)}
.tailx summary:hover{text-decoration:underline}
.acct{width:100%;font-size:12px;border-collapse:collapse}
.acct td{padding:4px 6px;border-bottom:1px dotted var(--rule-strong);vertical-align:top}
.acct tr:last-child td{border-bottom:0}
.acct .c{color:var(--faint);white-space:nowrap;width:1%}
.acct .a{text-align:right;white-space:nowrap;font-weight:600}
@media (max-width:640px){
  .acct,.acct tbody{display:block;width:100%}
  .acct tr:not(.acct-hist){display:grid;grid-template-columns:1fr auto;gap:0 12px;
    padding:8px 0;border-bottom:1px dotted var(--rule-strong)}
  .acct tr:not(.acct-hist) td{display:block;padding:0;border:0;width:auto}
  .acct tr:not(.acct-hist) td:not(.c):not(.a){grid-row:1;grid-column:1;font-size:13px}
  .acct tr:not(.acct-hist) td.a{grid-row:1;grid-column:2;align-self:start}
  .acct tr:not(.acct-hist) td.c:first-child{grid-row:2;grid-column:1;font-size:11px}
  .acct tr:not(.acct-hist) td.c:not(:first-child){grid-row:2;grid-column:2;text-align:right;
    font-size:11px;white-space:normal}
  .acct tr.acct-hist{display:block}
  .acct tr.acct-hist td{display:block;width:100%}
}
.cmpbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.cmpbar label{font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px}
.cmpbar select{font:inherit;font-size:13px;padding:6px 9px;border:1px solid var(--rule-strong);
  border-radius:8px;background:var(--card);color:var(--ink)}
.swing{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px}
.sw{background:var(--card);border:1px solid var(--rule);border-radius:9px;padding:11px 13px}
.sw .k{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--faint)}
.sw .v{font-size:19px;font-weight:600;margin-top:3px}
.sw .n{font-size:12px;color:var(--muted);margin-top:2px}
.verdictline{font-size:14.5px;line-height:1.55;margin:0 0 16px;padding:12px 14px;border-radius:9px;
  background:var(--accent-soft);border:1px solid var(--rule)}
.mv{width:100%;border-collapse:collapse;font-size:13px}
.mv th{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--faint);text-align:left;
  padding:7px 8px;border-bottom:1px solid var(--rule-strong);white-space:nowrap}
.mv td{padding:7px 8px;border-bottom:1px solid var(--rule);vertical-align:middle}
.mv tr:last-child td{border-bottom:0}
.mv .r{text-align:right;white-space:nowrap}
.mv .up{color:var(--bad);font-weight:600}
.mv .dn{color:var(--ok);font-weight:600}
#mvRevWrap .mv .up{color:var(--ok)}#mvRevWrap .mv .dn{color:var(--bad)}
.flag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.05em;padding:2px 6px;border-radius:4px;
  background:var(--warn-soft);color:var(--warn);margin-left:7px;white-space:nowrap}
@media (max-width:640px){
  .mv,.mv tbody{display:block;width:100%}
  .mv thead{display:none}
  .mv tr{display:grid;grid-template-columns:1fr auto;gap:1px 10px;padding:10px 2px;border-bottom:1px solid var(--rule)}
  .mv td{display:block;padding:0;border:0}
  .mv td.m-name{font-weight:600;grid-row:1 / span 2;grid-column:1}
  .mv td.m-vals{display:none}
  .mv td.m-delta{grid-row:1;grid-column:2;text-align:right;font-weight:600}
  .mv td.m-pct{grid-row:2;grid-column:2;text-align:right;font-size:11px;margin-top:1px}
}
.m-range{display:block;font-weight:400;font-size:11px;color:var(--faint);margin-top:2px}
@media (min-width:641px){.m-range{display:none}}
.mv tr[data-mvlabel]{cursor:pointer}
.mv tr[data-mvlabel]:hover td{background:var(--accent-soft)}
/* ---------- the method, set in ink ---------- */
#method{background:#10151b;border-radius:14px;margin:34px -14px 12px;padding:26px 26px 20px;
  --paper:#10151b;--card:#171d24;--ink:#eceae3;--muted:#a9aeb6;--faint:#7f858e;
  --rule:#272e37;--rule-strong:#39424d;--gridline:#232a33;
  --accent:#a9c3e2;--accent-soft:rgba(169,195,226,.12);
  --ok:#4cc38a;--ok-soft:rgba(76,195,138,.13);
  color:var(--ink);scroll-margin-top:64px;
  box-shadow:0 18px 50px -22px rgba(10,12,15,.55)}
.gateline{font-size:12.5px;background:var(--ok-soft);color:var(--ok);border:1px solid
  color-mix(in srgb,var(--ok) 35%,transparent);border-radius:8px;padding:9px 13px;margin-top:12px}
#method .gateline{box-shadow:0 0 26px rgba(76,195,138,.18)}
.clsch{display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:.08em;border-radius:4px;
  padding:2px 5px;margin-left:6px;vertical-align:1px;background:var(--accent-soft);color:var(--accent)}
:root[data-theme="dark"] #method{background:#070a0d;--paper:#070a0d;--card:#10151b;
  box-shadow:0 0 0 1px #1b222b}
@media (max-width:640px){#method{margin:26px -10px 10px;padding:20px 16px 14px;border-radius:12px}}
.foot{border-top:1px solid var(--rule);margin-top:30px;padding-top:14px;font-size:12px;color:var(--faint)}
.foot p{margin:0 0 7px;max-width:88ch}
.backrow a{font-size:12.5px;text-decoration:none;border:1px solid var(--rule-strong);
  border-radius:99px;padding:6px 13px;background:var(--card)}
/* ---------- pager ---------- */
.pager{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom));
  z-index:30;display:flex;align-items:center;gap:2px;background:var(--card);
  border:1px solid var(--rule-strong);border-radius:99px;padding:3px 6px;box-shadow:var(--shadow);
  transition:opacity .25s,transform .25s}
body:has(#modal:not([hidden])) .pager{display:none}
.pager.away{opacity:0;pointer-events:none;transform:translateX(-50%) translateY(14px)}
.pager button{border:0;background:transparent;color:var(--muted);cursor:pointer;width:32px;height:30px;
  border-radius:99px;font-size:11px}
.pager button:hover:not(:disabled){background:var(--accent-soft);color:var(--accent)}
.pager button:disabled{opacity:.3;cursor:default}
.pager .lbl{font-size:12px;font-weight:600;padding:0 6px;white-space:nowrap;max-width:44vw;
  overflow:hidden;text-overflow:ellipsis}
.pager .idx{color:var(--faint);font-weight:400;font-family:ui-monospace,Menlo,Consolas,monospace}
</style></head><body>
<div class="page">
  <div class="mast">
    <div class="mark"><a href="./">Public <span>Ledger</span></a></div>
    <span class="edition">COUNTY EDITION</span>
    <div class="meta">Niagara County · filings <b>__Y0__–__Y1__</b> · source
      <a href="https://www.osc.ny.gov/local-government/data">NYS Comptroller</a>
      <button class="themebtn" id="theme" type="button" aria-label="Toggle theme"></button></div>
  </div>

  <nav class="rail"><div class="rail-in">
    <a href="#money" class="on">Revenue &amp; spending</a>
    <a href="#peers">Nine counties</a>
    <a href="#shared">Sales tax, shared</a>
    <a href="#budget">Budget vs actual</a>
    <a href="#method">Method</a>
  </div></nav>

  <main class="wrap">
  <h1>Where Niagara County&rsquo;s money comes from, and where it goes</h1>
  <p class="lede">__YEARS__ years of the county&rsquo;s own annual filings to the state —
    self-reported, desk-reviewed but not audited by OSC. <b>No checkbook here, and honestly so:</b>
    the county does not publish its claims abstract, so this edition tells the filings story.
    The <a href="./">city edition</a> has a register because North Tonawanda publishes its warrants.</p>

  <div class="hcard">
    <div class="hrow" id="hRev"><span class="k">Revenue · __LATEST__</span><span class="v num" id="hRevV">—</span></div>
    <div class="hrow" id="hExp"><span class="k">Expenditure · __LATEST__</span><span class="v num" id="hExpV">—</span></div>
    <div class="hrow"><span class="k">Net · __LATEST__ filing</span><span class="v num closed" id="hNetV" style="color:__NETCOL__">—</span></div>
    <div class="hfoot">A single-year filing gap is not a deficit claim — fund balance, transfers
      and capital timing all argue. The county runs roughly <span class="num">__SCALE__&times;</span>
      North Tonawanda&rsquo;s budget.</div>
  </div>

  <section id="money">
    <h2>__YEARS__ years of revenue against spending</h2>
    <div class="panel">
      <div class="sub" id="trendSub"></div>
      <div class="legend"><span><b style="background:var(--rev)"></b>Revenue</span>
        <span><b style="background:var(--exp)"></b>Expenditure</span></div>
      <div class="chartwrap" id="trendWrap">
        <svg class="trend" id="trend" viewBox="0 0 900 300" role="img"
             aria-label="Niagara County revenue and expenditure, __Y0__ to __Y1__"></svg>
        <div class="tip" id="trendTip"></div>
      </div>
      <div style="margin-top:12px"><button class="pill" id="cmpOpen" type="button">
        Compare two years — what moved</button></div>
      <p class="note" id="trendNote"></p>
    </div>

    <h2>The filing, year by year — slide the chart or pick a pill</h2>
    <div class="years" id="yearPills" role="tablist" aria-label="Filing year"></div>
    <div class="pair">
      <div class="panel">
        <h3>Revenue <span class="tot num" id="revTot" style="color:var(--rev)"></span></h3>
        <div class="sub" id="revSub"></div>
        <div class="rank" id="revRank"></div>
        <div style="margin-top:12px"><button class="pill" id="revMore" type="button" hidden></button></div>
      </div>
      <div class="panel">
        <h3>Expenditure <span class="tot num" id="expTot" style="color:var(--exp)"></span></h3>
        <div class="sub" id="expSub"></div>
        <div class="rank" id="expRank"></div>
        <div style="margin-top:12px"><button class="pill" id="expMore" type="button" hidden></button></div>
      </div>
    </div>
    <p class="note">Open any category for its breakdown, its __YEARS__-year trend with the biggest
      moves marked and decomposable, and its composition over time. Every account line inside opens
      its own __YEARS__-year history. &ldquo;All other&rdquo; always opens — nothing is truncated.</p>
  </section>

  <section id="peers">
    <h2>Nine counties, per resident <span class="num" style="letter-spacing:0">__PEERYEAR__</span></h2>
    <div class="panel">
      <div class="sub">Each county&rsquo;s own __PEERYEAR__ filing, divided by its 2020 Census
        population. Counties differ in what they run — context, not a scorecard.</div>
      <div class="seg" id="peerSeg" role="tablist">
        <button type="button" role="tab" data-peer="exp" aria-selected="true">Spending</button>
        <button type="button" role="tab" data-peer="rev" aria-selected="false">Revenue</button>
        <button type="button" role="tab" data-peer="tax" aria-selected="false">Property tax</button>
      </div>
      <div class="rank" id="peerRank"></div>
      <p class="note" style="border:0;padding:0">The property-tax figure is the county levy only —
        cities, towns, villages and school districts are separate governments on the same parcel.</p>
    </div>
  </section>

  <section id="shared">
    <h2>The county&rsquo;s sales tax, shared <span class="num" style="letter-spacing:0">__SHAREDYEAR__</span></h2>
    <p class="lede">Every year the county hands a share of its sales tax to <b>every city, town and
      village inside it</b> — its filing carries the whole thing as one unlabeled line
      (<span class="num">A19854 &ldquo;Distribution of Sales Tax&rdquo;</span>). The county never names
      the recipients. <b>Their own filings do.</b> Below, the county&rsquo;s one line, rebuilt from
      twenty governments&rsquo; books.</p>
    <div class="panel">
      <div class="sub">The county&rsquo;s distribution line, __Y0__–__Y1__ — <span class="num">__DISTLATEST__</span>
        in __LATEST__</div>
      <svg viewBox="0 0 260 44" preserveAspectRatio="none" style="display:block;width:100%;height:52px">
        <path d="__SPARK__ L260 44 L0 44 Z" fill="var(--exp)" opacity=".10"></path>
        <path d="__SPARK__" fill="none" stroke="var(--exp)" stroke-width="1.6" vector-effect="non-scaling-stroke"></path>
      </svg>
    </div>
    <div class="panel" style="margin-top:14px">
      <h3>Who receives it <span class="tot num">__COUNTYLINE__</span></h3>
      <div class="sub">__SHAREDYEAR__ · each government&rsquo;s own filing of account A1120,
        &ldquo;Non-Property Tax Distribution by County&rdquo; · all twenty municipalities shown</div>
      <div class="rank">__RECIPROWS__</div>
      <div class="gateline num" style="margin-top:14px">&#10003; TWO SETS OF BOOKS, ONE STORY: county&rsquo;s
        line __COUNTYLINE__ &middot; recipients&rsquo; filings sum __RECIPSUM__ &middot; gap __GAPPCT__%</div>
      <p class="note">The county says it distributed __COUNTYLINE__; the twenty recipients&rsquo; own
        filings, added up, say __RECIPSUM__ — independent books agreeing to within __GAPPCT__%.
        Niagara Falls additionally imposes a city sales tax of its own (__NFOWN__ in __SHAREDYEAR__),
        shown in its filing separately from sharing — it is not part of this pot. Villages sit inside
        towns, so their residents appear in both layers; figures as filed.</p>
    </div>
  </section>

  <section id="budget">
    <h2>The budget, against the actuals <span class="num" style="letter-spacing:0">__BY__</span></h2>
    <p class="lede">What the Legislature <b>adopted</b> for __BY__, next to what the county&rsquo;s
      __BY__ filing says <b>actually happened</b> — the first machine-readable budget book, reconciled
      against the filing, line by NYS-chart line. Variances fold in every in-year amendment the
      Legislature passed after adoption; this is the year measured against the <i>original</i> promise.</p>
    <div class="gateline num">&#10003; BUDGET GATES PASS: parsed A-fund rows re-add to the book&rsquo;s
      printed __APRINT__ &middot; all funds to __ALLPRINT__ &middot; page-22 grand total reconciles</div>
    <div class="panel" style="margin-top:14px">
      <h3>General Fund, by chart-of-accounts line</h3>
      <div class="sub">Adopted appropriation vs filed expenditure · variance is actual minus budget</div>
      __ROOTTABLE__
      <p class="note">A9900 interfund transfers are excluded: the budget carries them as an
        appropriation, but the state filing classes them as &ldquo;other uses&rdquo;, outside the
        expenditure section — the two documents define that row differently, so comparing it would
        be false precision.</p>
    </div>
    <div class="panel" style="margin-top:14px">
      <h3>Every budgeted fund</h3>
      <div class="sub">Adopted vs filed, __BY__</div>
      __FUNDTABLE__
      <p class="note">The filing also carries funds the adopted budget does not price:
        __UNBUDGETED__ — self-insurance, capital projects and similar are governed outside the
        budget book, and the H capital fund is one-time by design.</p>
    </div>
  </section>

  <section id="method">
    <h2 style="color:var(--faint)">The method</h2>
    <p class="lede" style="color:var(--muted)">Built exactly like the city edition. Parsed from the
      Comptroller&rsquo;s statewide county files — <span class="num">__NROWS__</span> account-level
      rows for Niagara County, __Y0__–__Y1__ — joined on municipal code (never entity name),
      flows only, balance-sheet rows excluded. The 2013 schema change is resolved by column name
      per era and marked on every chart. <b style="color:var(--ink)">The build is a gate, not a
      report:</b> if any year goes missing or a total turns implausible, the generator halts and
      this page does not update.</p>
    <div class="gateline num">&#10003; BUILD GATES PASS: __YEARS__ consecutive years · totals in
      bounds · schema mapping continuous</div>
    <p class="lede" style="color:var(--muted);margin-top:12px;margin-bottom:4px">Self-reported AFR
      data: OSC desk-reviews these filings but does not audit them. Peer populations are the 2020
      Census (P1). Figures as filed; no inflation adjustment.</p>
  </section>

  <div class="foot">
    <p>Part of <a href="./">Public Ledger</a> — the City of North Tonawanda edition carries the
      reconciled warrant register, council briefs and the exception report. The
      <a href="atlas.html">County Atlas</a> profiles all twenty municipalities inside the county.</p>
    <div class="backrow"><a href="./">&larr; Public Ledger — the city edition</a></div>
  </div>
  </main>
</div>

<div class="pager" id="pager">
  <button type="button" id="pgUp" aria-label="Previous section">&#9650;</button>
  <span class="lbl"><span class="idx" id="pgIdx"></span> <span id="pgName"></span></span>
  <button type="button" id="pgDn" aria-label="Next section">&#9660;</button>
</div>

<div class="modal" id="modal" hidden>
  <div class="backdrop" data-close></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="mTitle">
    <header>
      <div>
        <div class="eyebrow" id="mEyebrow"></div>
        <h3 id="mTitle"></h3>
        <div class="mbig" id="mBig"></div>
      </div>
      <button class="xbtn" type="button" data-close aria-label="Close">&#10005;</button>
    </header>
    <nav class="tabs" role="tablist" id="mTabs"></nav>
    <div class="mbody" id="mBody"></div>
  </div>
</div>

<script id="cdata" type="application/json">__PAYLOAD__</script>
<script>
(function(){
"use strict";
var O=JSON.parse(document.getElementById('cdata').textContent);
var F=O.flows, FD=O.dict;
var FI_YR=0,FI_SEC=1,FI_L1=2,FI_L2=3,FI_OBJ=4,FI_NARR=5,FI_ACCT=6,FI_AMT=7;
var REDUCED=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
function money0(v){return (v<0?'−$':'$')+Math.round(Math.abs(v)).toLocaleString('en-US');}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escA(v){return esc(v).replace(/"/g,'&quot;');}

/* ---- hero ---- */
(function(){
  var li=O.years.length-1, rl=O.rev[li], el=O.exp[li], net=rl-el;
  function roll(el2,target,fmt){
    if(REDUCED){el2.textContent=fmt(target);return;}
    var t0=performance.now(),D=750;
    (function tick(t){var p=Math.min(1,(t-t0)/D);p=1-Math.pow(1-p,3);
      el2.textContent=fmt(Math.round(target*p));if(p<1)requestAnimationFrame(tick);})(t0);
  }
  roll(document.getElementById('hRevV'),rl,money0);
  roll(document.getElementById('hExpV'),el,money0);
  roll(document.getElementById('hNetV'),Math.abs(net),function(v){return (net<0?'−':'+')+money0(v);});
})();

/* ---- flow helpers (identical to the city page) ---- */
function flowsFor(year, sec, l1Label){
  var out=[];
  for(var i=0;i<F.length;i++){
    var f=F[i];
    if(f[FI_YR]!==year || f[FI_SEC]!==sec) continue;
    if(FD.l1[f[FI_L1]]!==l1Label) continue;
    out.push(f);
  }
  return out;
}
function sumBy(rows, dictKey, idx){
  var m={};
  rows.forEach(function(f){ var k=FD[dictKey][f[idx]]; m[k]=(m[k]||0)+f[FI_AMT]; });
  return Object.keys(m).map(function(k){return [k,m[k]];}).sort(function(a,b){return b[1]-a[1];});
}
var catIndex=null;
function buildCatIndex(){
  catIndex={};
  for(var i=0;i<F.length;i++){
    var f=F[i], sec=f[FI_SEC], k=sec+'|'+FD.l1[f[FI_L1]];
    (catIndex[k]||(catIndex[k]={}))[f[FI_YR]]=((catIndex[k]||{})[f[FI_YR]]||0)+f[FI_AMT];
    var t='T'+sec;
    (catIndex[t]||(catIndex[t]={}))[f[FI_YR]]=((catIndex[t]||{})[f[FI_YR]]||0)+f[FI_AMT];
  }
}
function seriesFor(sec,l1){
  if(!catIndex) buildCatIndex();
  var m=catIndex[sec+'|'+l1]||{};
  return O.years.map(function(y){return m[y]||0;});
}
function sectionSeries(sec){
  if(!catIndex) buildCatIndex();
  var m=catIndex['T'+sec]||{};
  return O.years.map(function(y){return m[y]||0;});
}
function subSeriesFor(sec,l1){
  var m={};
  for(var i=0;i<F.length;i++){
    var f=F[i];
    if(f[FI_SEC]!==sec || FD.l1[f[FI_L1]]!==l1) continue;
    var k=FD.l2[f[FI_L2]];
    (m[k]||(m[k]={}))[f[FI_YR]]=((m[k]||{})[f[FI_YR]]||0)+f[FI_AMT];
  }
  return Object.keys(m).map(function(k){
    var vals=O.years.map(function(y){return m[k][y]||0;});
    return {label:k,values:vals,last:vals[vals.length-1]};
  }).sort(function(a,b){return b.last-a.last;});
}
function pctChange(a,b){
  if(!a) return b?'new':'—';
  var p=(b-a)/a*100;
  return (p>=0?'+':'')+p.toFixed(0)+'%';
}

/* ---- reusable line chart with crosshair (ported) ---- */
function renderLine(host, values, opts){
  opts=opts||{};
  var narrow=(host.clientWidth||760)<520;
  var yrs=O.years, W=narrow?380:760;
  var H=opts.h||210, ml=narrow?42:58, mr=narrow?10:16, mt=12, mb=narrow?22:24;
  var fs=narrow?12:10.5;
  var max=Math.max.apply(null,values)*1.08||1;
  var x=function(i){return ml+(W-ml-mr)*(i/(yrs.length-1));};
  var y=function(v){return mt+(H-mt-mb)*(1-v/max);};
  var fmt=opts.pct?function(v){return v.toFixed(1)+'%';}:money0;
  var p=[],ticks=4;
  for(var t=0;t<=ticks;t++){
    var gv=max/ticks*t;
    p.push('<line class="gl" x1="'+ml+'" y1="'+y(gv).toFixed(1)+'" x2="'+(W-mr)+'" y2="'+y(gv).toFixed(1)+'"/>');
    p.push('<text class="ax" x="'+(ml-7)+'" y="'+(y(gv)+fs/3).toFixed(1)+'" text-anchor="end" font-size="'+fs+'">'+
      (opts.pct?gv.toFixed(0)+'%'
       :gv>=995000?'$'+(gv/1e6>=9.95?Math.round(gv/1e6):(gv/1e6).toFixed(1))+'M'
       :'$'+Math.round(gv/1e3)+'K')+'</text>');
  }
  var bi=yrs.indexOf(O.schemaBreak);
  if(bi>0){
    var bx=((x(bi)+x(bi-1))/2).toFixed(1);
    p.push('<line class="brk" x1="'+bx+'" y1="'+mt+'" x2="'+bx+'" y2="'+(H-mb)+'"/>');
  }
  var every=narrow?10:5;
  yrs.forEach(function(yr,i){
    if(yr%every===0||i===yrs.length-1)
      p.push('<text class="ax" x="'+x(i).toFixed(1)+'" y="'+(H-mb+fs+3)+'" text-anchor="middle" font-size="'+fs+'">'+
        (narrow?String(yr).slice(2):yr)+'</text>');
  });
  var d=values.map(function(v,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);}).join(' ');
  p.push('<path d="'+d+' L'+x(values.length-1).toFixed(1)+' '+(H-mb)+' L'+ml+' '+(H-mb)+' Z" fill="var('+opts.color+')" opacity=".10"/>');
  p.push('<path class="ln" d="'+d+'" stroke="var('+opts.color+')"/>');
  (opts.marks||[]).forEach(function(i){
    p.push('<circle cx="'+x(i).toFixed(1)+'" cy="'+y(values[i]).toFixed(1)+'" r="4" fill="var(--paper)" '+
      'stroke="var('+opts.color+')" stroke-width="2"><title>'+yrs[i]+' — select to decompose</title></circle>');
  });
  if(opts.sel!=null)
    p.push('<circle cx="'+x(opts.sel).toFixed(1)+'" cy="'+y(values[opts.sel]).toFixed(1)+'" r="5" '+
      'fill="var('+opts.color+')" stroke="var(--paper)" stroke-width="2"/>');
  p.push('<g class="xh" style="opacity:0"><line class="brk" y1="'+mt+'" y2="'+(H-mb)+'"/>'+
    '<circle class="dot" r="4.5" fill="var('+opts.color+')"/></g>');
  p.push('<rect class="hit" x="'+ml+'" y="'+mt+'" width="'+(W-ml-mr)+'" height="'+(H-mt-mb)+'" fill="transparent"'+
    (opts.onPick?' style="cursor:pointer"':'')+'/>');
  host.innerHTML='<div class="chartwrap"><svg class="trend" viewBox="0 0 '+W+' '+H+'">'+p.join('')+
    '</svg><div class="tip"></div></div>';
  var svg=host.querySelector('svg'), tip=host.querySelector('.tip'),
      wrap=host.querySelector('.chartwrap'), xh=host.querySelector('.xh'),
      xl=xh.querySelector('line'), xc=xh.querySelector('circle');
  var hit=host.querySelector('.hit');
  hit.addEventListener('mousemove',function(ev){
    var r=svg.getBoundingClientRect();
    var i=Math.round(((ev.clientX-r.left)/r.width*W-ml)/((W-ml-mr)/(yrs.length-1)));
    i=Math.max(0,Math.min(yrs.length-1,i));
    xh.style.opacity=1;
    xl.setAttribute('x1',x(i)); xl.setAttribute('x2',x(i));
    xc.setAttribute('cx',x(i)); xc.setAttribute('cy',y(values[i]));
    tip.innerHTML='<div class="ty num">'+yrs[i]+'</div><div class="tl"><span>'+
      esc(opts.name||'Value')+'</span><span class="num">'+fmt(values[i])+'</span></div>';
    tip.style.opacity=1;
    var wx=x(i)/W*wrap.clientWidth;
    tip.style.left=Math.min(Math.max(wx-tip.offsetWidth/2,0),wrap.clientWidth-tip.offsetWidth)+'px';
    tip.style.top='2px';
  });
  hit.addEventListener('mouseleave',function(){tip.style.opacity=0;tip.style.left='0px';xh.style.opacity=0;});
  if(opts.onPick) hit.addEventListener('click',function(ev){
    var r=svg.getBoundingClientRect();
    var i=Math.round(((ev.clientX-r.left)/r.width*W-ml)/((W-ml-mr)/(yrs.length-1)));
    opts.onPick(Math.max(0,Math.min(yrs.length-1,i)));
  });
}
function sparkSVG(values,color){
  var W=200,H=38,max=Math.max.apply(null,values)||1;
  var x=function(i){return W*(i/(values.length-1));};
  var y=function(v){return H-(H-3)*(v/max)-1.5;};
  var d=values.map(function(v,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);}).join(' ');
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+
    '<path d="'+d+' L'+W+' '+H+' L0 '+H+' Z" fill="var('+color+')" opacity=".12"/>'+
    '<path d="'+d+'" fill="none" stroke="var('+color+')" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
}

/* ---- share strip + mini bars, filterable (ported) ---- */
var SHARE_COLORS=['--sch','--cty','--cnt'];
function miniBars(items,total,cssVar,attrKey,activeVal){
  var max=items.reduce(function(m,x){return Math.max(m,x[1]);},0)||1;
  return '<div class="minis">'+items.map(function(x){
    var act=attrKey&&activeVal===x[0];
    return '<div class="sb'+(attrKey?' can':'')+(act?' on':'')+'"'+
        (attrKey?' '+attrKey+'="'+escA(x[0])+'" role="button" tabindex="0"':'')+'>'+
      '<span>'+esc(x[0])+(act?' <b class="onmark">&#10003;</b>':'')+'</span>'+
      '<span class="num">'+money0(x[1])+' <span style="color:var(--faint)">'+
        (total?(x[1]/total*100).toFixed(1):'0')+'%</span></span>'+
      '<span class="t"><i style="width:'+(x[1]/max*100).toFixed(2)+'%;background:var('+cssVar+')"></i></span></div>';
  }).join('')+'</div>';
}
function shareBar(items,total,filterKey,activeVal){
  var head=items.slice(0,3), tail=items.slice(3);
  var parts=head.map(function(x,i){return {label:x[0],v:x[1],css:'var('+SHARE_COLORS[i]+')'};});
  var tv=tail.reduce(function(s,x){return s+x[1];},0);
  if(tv>0) parts.push({label:'All other ('+tail.length+')',v:tv,css:'#c6bfb0',mut:1});
  var attr=function(p){
    if(!filterKey||p.mut) return '';
    return ' '+filterKey+'="'+escA(p.label)+'" role="button" tabindex="0"';
  };
  var h='<div class="tb-bar sharebar" style="height:26px;margin:6px 0 10px">'+parts.map(function(p){
    var act=filterKey&&activeVal===p.label;
    return '<i'+attr(p)+(act?' class="on"':'')+' style="width:'+(p.v/total*100).toFixed(2)+
      '%;background:'+p.css+(filterKey&&!p.mut?';cursor:pointer':'')+'" title="'+
      esc(p.label)+' — '+money0(p.v)+' ('+(p.v/total*100).toFixed(1)+'%)"></i>';}).join('')+'</div>';
  h+='<div class="sharelegend">'+parts.map(function(p){
    var act=filterKey&&activeVal===p.label;
    return '<span'+attr(p)+' class="'+(filterKey&&!p.mut?'can ':'')+(act?'on':'')+'"'+
      (p.mut?' style="color:var(--muted)"':'')+'><b style="background:'+p.css+'"></b>'+
      esc(p.label)+(act?' <b class="onmark">&#10003;</b>':'')+
      ' <span class="num">'+money0(p.v)+' · '+(p.v/total*100).toFixed(1)+'%</span></span>';
  }).join('')+'</div>';
  if(tv>0)
    h+='<details class="tailx"><summary>See the '+tail.length+' grouped as “All other”</summary>'+
       miniBars(tail,total,'--exp',filterKey,activeVal)+'</details>';
  return h;
}
function drillHTML(year,sec,label,cssVar){
  var all=flowsFor(year,sec,label);
  if(!all.length) return '';
  var fL2=MODAL.fL2||null, fObj=MODAL.fObj||null;
  var byL2=function(f){return !fL2||FD.l2[f[FI_L2]]===fL2;};
  var byObj=function(f){return !fObj||FD.obj[f[FI_OBJ]]===fObj;};
  var rows=all.filter(function(f){return byL2(f)&&byObj(f);});
  var l2rows=all.filter(byObj), objrows=all.filter(byL2);
  var l2=sumBy(l2rows,'l2',FI_L2), obj=sumBy(objrows,'obj',FI_OBJ);
  var l2t=l2rows.reduce(function(s,f){return s+f[FI_AMT];},0);
  var objt=objrows.reduce(function(s,f){return s+f[FI_AMT];},0);
  var h='';
  if(l2.length>1||(l2.length===1&&l2[0][0]!==label)||fL2)
    h+='<h4>Within '+esc(label)+'</h4>'+miniBars(l2,l2t,cssVar,'data-fl2',fL2);
  if(obj.length>1||fObj)
    h+='<h4>By type of spending</h4>'+shareBar(obj,objt,'data-fobj',fObj);
  var showObj=obj.length>1||(obj.length===1&&obj[0][0]!=='Unclassified');
  var chips='';
  if(fL2) chips+=' <span class="chip-f">'+esc(fL2)+'<button type="button" data-cclear="l2" aria-label="Clear">&#10005;</button></span>';
  if(fObj) chips+=' <span class="chip-f">'+esc(fObj)+'<button type="button" data-cclear="obj" aria-label="Clear">&#10005;</button></span>';
  var countTxt=(fL2||fObj)?rows.length+' of '+all.length:String(all.length);
  h+='<h4>'+countTxt+' account line'+(rows.length===1?'':'s')+chips+
    ' <span style="text-transform:none;letter-spacing:0">— select one for its '+O.years.length+'-year history</span></h4>'+
    '<table class="acct"><tbody>'+
    rows.slice().sort(function(a,b){return b[FI_AMT]-a[FI_AMT];}).map(function(f){
      return '<tr data-acct="'+esc(f[FI_ACCT])+'" style="cursor:pointer" role="button" tabindex="0">'+
        '<td class="c num">'+esc(f[FI_ACCT])+'</td><td>'+esc(FD.narr[f[FI_NARR]])+'</td>'+
        (showObj?'<td class="c">'+esc(FD.obj[f[FI_OBJ]])+'</td>':'')+
        '<td class="a num">'+money0(f[FI_AMT])+'</td></tr>';
    }).join('')+'</tbody></table>';
  if(!rows.length)
    h+='<p class="lede">Nothing matches both selections — clear one above.</p>';
  return h;
}

/* ---- ranked lists (ported) ---- */
function renderRank(el,items,cssVar,total,onClick,expand,onOther){
  var max=items.reduce(function(m,x){return Math.max(m,x[1]);},0);
  el.innerHTML=items.map(function(x,i){
    var pct=total?(x[1]/total*100):0;
    var isOther=/^All other/.test(x[0]);
    var fill=isOther?'var(--rule-strong)':'var('+cssVar+')';
    var clickable=onClick&&!isOther;
    var drillable=expand&&!isOther;
    var otherable=isOther&&onOther;
    var interactive=clickable||drillable||otherable;
    return '<div class="rk'+(drillable?' can':'')+'"'+
        (clickable?' data-rank="'+i+'" style="cursor:pointer"':'')+
        (drillable?' data-exp="'+i+'"':'')+
        (otherable?' data-other="1" style="cursor:pointer"':'')+
        (interactive?' role="button" tabindex="0"':'')+'>'+
      '<span class="lb"'+(isOther?' style="color:var(--muted)"':'')+'>'+esc(x[0])+
        (otherable?' <span class="see">— view all</span>':'')+'</span>'+
      '<span class="vl num"'+(isOther?' style="color:var(--muted)"':'')+'>'+money0(x[1])+'</span>'+
      '<span class="tr"><i style="width:'+(x[1]/max*100).toFixed(2)+'%;background:'+fill+'"></i></span>'+
      '<span class="pc num">'+pct.toFixed(1)+'% of total</span>'+
    '</div>';}).join('');
  if(!el.__wired){
    el.__wired=true;
    el.addEventListener('click',function(e){
      var o=e.target.closest('[data-other]');
      if(o&&el.__other){el.__other(o);return;}
      var d=e.target.closest('[data-exp]');
      if(d&&el.__expand){el.__expand(el.__items[+d.getAttribute('data-exp')],d);return;}
      var t=e.target.closest('[data-rank]');
      if(t&&el.__click) el.__click(el.__items[+t.getAttribute('data-rank')]);
    });
  }
  el.__items=items; el.__click=onClick; el.__expand=expand; el.__other=onOther;
}

/* ---- category modal (ported: breakdown / trend / composition) ---- */
var MODAL={kind:'cat',year:null,sec:0,label:'',color:'--rev',tab:'breakdown',opener:null};
function openModal(year,sec,label,cssVar,opener){
  MODAL.kind='cat';
  MODAL.year=year;MODAL.sec=sec;MODAL.label=label;MODAL.color=cssVar;
  MODAL.tab='breakdown';MODAL.opener=opener||null;
  MODAL.fL2=null;MODAL.fObj=null;
  document.getElementById('mTabs').innerHTML=
    '<button type="button" role="tab" data-tab="breakdown" aria-selected="true">Breakdown</button>'+
    '<button type="button" role="tab" data-tab="trend" aria-selected="false">Trend</button>'+
    '<button type="button" role="tab" data-tab="composition" aria-selected="false">Composition</button>';
  var rows=flowsFor(year,sec,label);
  var total=rows.reduce(function(s,f){return s+f[FI_AMT];},0);
  var secTot=sectionSeries(sec)[O.years.indexOf(year)]||0;
  document.getElementById('mEyebrow').textContent=(sec?'Expenditure':'Revenue')+' · '+year+' filing · Niagara County';
  document.getElementById('mTitle').textContent=label;
  document.getElementById('mBig').innerHTML='<span class="num">'+money0(total)+'</span> '+
    '<span>'+(secTot?(total/secTot*100).toFixed(1):'0')+'% of '+(sec?'expenditure':'revenue')+'</span>';
  document.getElementById('modal').hidden=false;
  document.body.style.overflow='hidden';
  renderTab('breakdown');
  document.querySelector('#mTabs button').focus();
}
function closeModal(){
  document.getElementById('modal').hidden=true;
  document.body.style.overflow='';
  if(MODAL.opener&&MODAL.opener.focus) MODAL.opener.focus();
}
function renderTab(tab){
  MODAL.tab=tab;
  var body=document.getElementById('mBody');
  var yr=MODAL.year, sec=MODAL.sec, label=MODAL.label, col=MODAL.color;

  if(tab==='breakdown'){
    body.innerHTML=drillHTML(yr,sec,label,col)||'<p class="lede">No detail filed for this category.</p>';
    return;
  }
  if(tab==='trend'){
    var vals=seriesFor(sec,label), tot=sectionSeries(sec);
    var share=vals.map(function(v,i){return tot[i]?v/tot[i]*100:0;});
    var i0=0, iN=vals.length-1;
    var firstNonZero=vals.findIndex(function(v){return v>0;});
    if(firstNonZero>0) i0=firstNonZero;
    var moves=[];
    for(var mi=1;mi<vals.length;mi++)
      if(O.years[mi]!==O.schemaBreak) moves.push([Math.abs(vals[mi]-vals[mi-1]),mi]);
    moves.sort(function(a,b){return b[0]-a[0];});
    var marks=moves.slice(0,3).map(function(m){return m[1];});
    body.innerHTML=
      '<div class="mstats">'+
        '<div class="mstat"><div class="k">'+O.years[i0]+'</div><div class="v num">'+money0(vals[i0])+'</div></div>'+
        '<div class="mstat"><div class="k">'+O.years[iN]+'</div><div class="v num">'+money0(vals[iN])+'</div></div>'+
        '<div class="mstat"><div class="k">Change</div><div class="v num">'+pctChange(vals[i0],vals[iN])+'</div></div>'+
        '<div class="mstat"><div class="k">Share of '+(sec?'spend':'revenue')+'</div><div class="v num">'+
          share[iN].toFixed(1)+'%</div></div>'+
      '</div>'+
      '<h4>'+esc(label)+' by year — select any year to decompose it</h4><div id="mLine"></div>'+
      '<div id="mMove"></div>'+
      '<h4>Share of total '+(sec?'expenditure':'revenue')+'</h4><div id="mShare"></div>'+
      '<p class="note">Figures either side of '+O.schemaBreak+' sit on different reporting bases '+
      '(marked by the dashed line) and are not strictly comparable.</p>';
    function drawMain(sel){
      renderLine(document.getElementById('mLine'),vals,
        {color:col,name:label,marks:marks,sel:sel,onPick:function(i){if(i>0)renderMove(i);}});
    }
    function renderMove(i){
      drawMain(i);
      var yy=O.years[i], prev=O.years[i-1];
      var cur={},was={};
      flowsFor(yy,sec,label).forEach(function(f){
        var k=f[FI_NARR]+'|'+f[FI_ACCT]; cur[k]=(cur[k]||0)+f[FI_AMT];});
      flowsFor(prev,sec,label).forEach(function(f){
        var k=f[FI_NARR]+'|'+f[FI_ACCT]; was[k]=(was[k]||0)+f[FI_AMT];});
      var keys={};Object.keys(cur).forEach(function(k){keys[k]=1;});Object.keys(was).forEach(function(k){keys[k]=1;});
      var rows=Object.keys(keys).map(function(k){
        var c=cur[k]||0,w=was[k]||0;
        return {narr:FD.narr[+k.split('|')[0]],acct:k.split('|')[1],cur:c,was:w,d:c-w};
      }).sort(function(a,b){return Math.abs(b.d)-Math.abs(a.d);});
      var net=vals[i]-vals[i-1];
      var top=rows.slice(0,7);
      var covered=top.reduce(function(s,r){return s+r.d;},0);
      var h='<h4>What moved in '+yy+' <span style="text-transform:none;letter-spacing:0">— vs '+prev+
        ', net '+(net>=0?'+':'−')+money0(Math.abs(net))+'</span></h4>';
      if(yy===O.schemaBreak||prev===O.schemaBreak)
        h+='<div class="thin">This pair straddles the '+O.schemaBreak+
           ' reporting-basis change — part of any move here is definitional.</div>';
      h+='<table class="mv"><thead><tr><th>Account line</th><th class="r">'+prev+'</th><th class="r">'+yy+
         '</th><th class="r">Change</th></tr></thead><tbody>'+
        top.map(function(r){
          var flag=r.was===0?'<span class="flag">NEW</span>':(r.cur===0?'<span class="flag">ENDED</span>':'');
          return '<tr><td class="m-name">'+esc(r.narr)+flag+
            ' <span class="fnt num">'+esc(r.acct)+'</span></td>'+
            '<td class="r num m-vals">'+money0(r.was)+'</td>'+
            '<td class="r num m-vals">'+money0(r.cur)+'</td>'+
            '<td class="r num m-delta '+(r.d>=0?'up':'dn')+'">'+(r.d>=0?'+':'−')+money0(Math.abs(r.d))+'</td></tr>';
        }).join('')+'</tbody></table>'+
        '<p class="fnt" style="margin-top:8px">These '+top.length+' account lines explain '+
        (net!==0?Math.min(Math.abs(covered/net)*100,999).toFixed(0)+'%':'all')+
        ' of the net move. Accounts beginning H are capital-project funds — one-time outlays, not operating growth.</p>';
      document.getElementById('mMove').innerHTML=h;
    }
    if(marks.length) renderMove(marks[0]); else drawMain(null);
    renderLine(document.getElementById('mShare'),share,{color:col,name:'Share',pct:true,h:170});
    return;
  }
  var subs=subSeriesFor(sec,label);
  if(subs.length<2){
    body.innerHTML='<p class="lede">'+esc(label)+' is filed as a single line — there are no '+
      'sub-categories to compare over time. The Trend tab shows its history.</p>';
    return;
  }
  var iLast=O.years.length-1;
  body.innerHTML='<h4>Each part of '+esc(label)+', '+O.years[0]+'–'+O.years[iLast]+'</h4>'+
    '<div class="small">'+subs.map(function(s){
      var f=s.values.findIndex(function(v){return v>0;});
      return '<div class="sm"><div class="n">'+esc(s.label)+'</div>'+
        '<div class="v num">'+money0(s.last)+' <span style="color:var(--faint)">'+
          pctChange(f>=0?s.values[f]:0,s.last)+' since '+(f>=0?O.years[f]:O.years[0])+'</span></div>'+
        sparkSVG(s.values,MODAL.color)+'</div>';
    }).join('')+'</div>'+
    '<p class="note">Each panel is scaled to its own maximum, so read the shape and the figures, '+
    'not the relative heights between panels.</p>';
}

/* ---- per-account history (ported; county general ledger) ---- */
function acctHistory(tr){
  var next=tr.nextElementSibling;
  if(next&&next.className==='acct-hist'){next.remove();return;}
  var already=tr.parentElement.querySelector('.acct-hist');
  if(already) already.remove();
  var code=tr.getAttribute('data-acct');
  var vals=O.years.map(function(){return 0;});
  var narr='';
  for(var i=0;i<F.length;i++){
    var f=F[i];
    if(f[FI_SEC]===MODAL.sec&&f[FI_ACCT]===code){
      vals[O.years.indexOf(f[FI_YR])]+=f[FI_AMT];
      narr=FD.narr[f[FI_NARR]];
    }
  }
  var iN=vals.length-1, latest=vals[iN];
  var prior=vals.slice(0,iN).filter(function(v){return v>0;}).sort(function(a,b){return a-b;});
  var med=prior.length?prior[Math.floor(prior.length/2)]:0;
  var firstIdx=vals.findIndex(function(v){return v>0;});
  var read='';
  if(med>0&&latest>0){
    var ratio=latest/med;
    read='FY'+O.years[iN]+': <b class="num">'+money0(latest)+'</b> — '+
      (ratio>=1?ratio.toFixed(1)+'&times;':(1/ratio).toFixed(1)+'&times; below')+
      ' the prior-year median ('+money0(med)+').';
    if(ratio>=3&&latest>=50000) read+=' <b>Worth a question.</b>';
  } else if(latest>0){
    read='FY'+O.years[iN]+': <b class="num">'+money0(latest)+'</b> — no meaningful prior history.';
  }
  if(firstIdx>0) read+=' First appears FY'+O.years[firstIdx]+'.';
  if(/Unclassified/i.test(narr))
    read+=' The 2770-series is the state&rsquo;s catch-all — its own name says <i>&ldquo;(specify)&rdquo;</i>, '+
      'so a large or growing balance is a standard audit question. The itemisation lives in the '+
      'county&rsquo;s general ledger, one request away.';
  var row=document.createElement('tr');
  row.className='acct-hist';
  row.innerHTML='<td colspan="'+tr.children.length+'" style="padding:12px 0 16px">'+
    '<div class="ah-chart"></div><p class="fnt" style="margin:8px 0 0;max-width:76ch">'+read+'</p></td>';
  tr.after(row);
  renderLine(row.querySelector('.ah-chart'),vals,{color:MODAL.color,name:code,h:170});
}

/* ---- modal wiring ---- */
(function(){
  document.getElementById('mBody').addEventListener('click',function(e){
    if(MODAL.kind==='cat'&&MODAL.tab==='breakdown'){
      var cc=e.target.closest('[data-cclear]');
      if(cc){if(cc.getAttribute('data-cclear')==='l2')MODAL.fL2=null;else MODAL.fObj=null;
        renderTab('breakdown');return;}
      var f2=e.target.closest('[data-fl2]');
      if(f2){var v2=f2.getAttribute('data-fl2');
        MODAL.fL2=(MODAL.fL2===v2)?null:v2;renderTab('breakdown');return;}
      var fo=e.target.closest('[data-fobj]');
      if(fo){var vo=fo.getAttribute('data-fobj');
        MODAL.fObj=(MODAL.fObj===vo)?null:vo;renderTab('breakdown');return;}
    }
    if(MODAL.kind==='compare'){
      var mv=e.target.closest('tr[data-mvlabel]');
      if(mv){
        var lbl=mv.getAttribute('data-mvlabel'), ms=+mv.getAttribute('data-mvsec');
        var toYear=+document.getElementById('cmpB').value;
        openModal(toYear, ms, lbl, ms?'--exp':'--rev', null);
        renderTab('trend');
        [].forEach.call(document.querySelectorAll('#mTabs button'),function(x){
          x.setAttribute('aria-selected', x.dataset.tab==='trend'?'true':'false');});
        return;
      }
    }
    var tr=e.target.closest('tr[data-acct]');
    if(tr) acctHistory(tr);
  });
  document.getElementById('mTabs').addEventListener('click',function(e){
    var b=e.target.closest('button[data-tab]');if(!b)return;
    [].forEach.call(this.querySelectorAll('button'),function(x){
      x.setAttribute('aria-selected',x===b?'true':'false');});
    renderTab(b.dataset.tab);
  });
  document.getElementById('modal').addEventListener('click',function(e){
    if(e.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&!document.getElementById('modal').hidden) closeModal();
  });
})();

/* ---- compare two years (ported), in the modal ---- */
function catTotals(sec,yr){
  var m={};
  for(var i=0;i<F.length;i++){
    var f=F[i];
    if(f[FI_YR]!==yr||f[FI_SEC]!==sec) continue;
    var k=FD.l1[f[FI_L1]];
    m[k]=(m[k]||0)+f[FI_AMT];
  }
  return m;
}
function movers(sec,a,b){
  var A=catTotals(sec,a),B=catTotals(sec,b),keys={};
  Object.keys(A).forEach(function(k){keys[k]=1;});Object.keys(B).forEach(function(k){keys[k]=1;});
  return Object.keys(keys).map(function(k){
    var av=A[k]||0,bv=B[k]||0;
    return {k:k,a:av,b:bv,d:bv-av,pct:av?(bv-av)/av*100:(bv?null:0)};
  }).sort(function(x,y){return Math.abs(y.d)-Math.abs(x.d);});
}
function renderCompare(){
  var a=+document.getElementById('cmpA').value, b=+document.getElementById('cmpB').value;
  var ia=O.years.indexOf(a), ib=O.years.indexOf(b);
  var out=document.getElementById('cmpOut');
  if(ia<0||ib<0||a===b){out.innerHTML='<p class="lede">Pick two different years.</p>';return;}
  var revA=O.rev[ia],revB=O.rev[ib],expA=O.exp[ia],expB=O.exp[ib];
  var netA=revA-expA,netB=revB-expB;
  var revGrowth=revA?(revB-revA)/revA*100:0;
  var expGrowth=expA?(expB-expA)/expA*100:0;
  var sign=function(v){return (v<0?'−':'+')+money0(Math.abs(v));};
  var cls=function(v){return v<0?'dn':'up';};
  var swing=
    '<div class="swing">'+
      '<div class="sw"><div class="k">Revenue</div><div class="v num" style="color:var(--rev)">'+sign(revB-revA)+
        '</div><div class="n num">'+(revGrowth>=0?'+':'')+revGrowth.toFixed(1)+'% · '+money0(revA)+' → '+money0(revB)+'</div></div>'+
      '<div class="sw"><div class="k">Expenditure</div><div class="v num" style="color:var(--exp)">'+sign(expB-expA)+
        '</div><div class="n num">'+(expGrowth>=0?'+':'')+expGrowth.toFixed(1)+'% · '+money0(expA)+' → '+money0(expB)+'</div></div>'+
      '<div class="sw"><div class="k">'+a+' net</div><div class="v num" style="color:'+(netA<0?'var(--bad)':'var(--ok)')+'">'+
        sign(netA)+'</div><div class="n">'+(netA<0?'filing gap':'surplus')+'</div></div>'+
      '<div class="sw"><div class="k">'+b+' net</div><div class="v num" style="color:'+(netB<0?'var(--bad)':'var(--ok)')+'">'+
        sign(netB)+'</div><div class="n">'+(netB<0?'filing gap':'surplus')+'</div></div>'+
    '</div>';
  var line='Between '+a+' and '+b+', revenue '+(revB>=revA?'rose':'fell')+' '+
    Math.abs(revGrowth).toFixed(1)+'% while spending '+(expB>=expA?'rose':'fell')+' '+
    Math.abs(expGrowth).toFixed(1)+'%. The bottom line moved '+sign(netB-netA)+', from '+
    money0(netA)+' to '+money0(netB)+'. ';
  line+=expGrowth>revGrowth
    ?'<b>Spending grew faster than revenue</b> — the categories flagged below are the ones that outpaced it.'
    :'Revenue grew at least as fast as spending over this pair.';
  if((a<O.schemaBreak)!==(b<O.schemaBreak))
    line+=' <b>These two years sit on different reporting bases</b> (OSC changed its schema in '+
          O.schemaBreak+'), so part of any change here is definitional rather than real.';
  function table(sec,label,wrapId){
    var rows=movers(sec,a,b).filter(function(m){return Math.abs(m.d)>=5000;}).slice(0,8);
    if(!rows.length) return '';
    return '<div id="'+wrapId+'"><h4 style="margin:18px 0 8px;font:600 11px/1 system-ui;letter-spacing:.08em;'+
      'text-transform:uppercase;color:var(--faint)">'+label+'</h4>'+
      '<table class="mv"><thead><tr><th>Category</th><th class="r">'+a+'</th><th class="r">'+b+
      '</th><th class="r">Change</th><th class="r">%</th></tr></thead><tbody>'+
      rows.map(function(m){
        var outpaced=sec===1&&m.pct!==null&&m.d>0&&m.pct>revGrowth;
        return '<tr data-mvlabel="'+escA(m.k)+'" data-mvsec="'+sec+'" role="button" tabindex="0" title="Open — full history and drill"><td class="m-name">'+esc(m.k)+
            (outpaced?'<span class="flag">OUTPACED REVENUE</span>':'')+'<span class="m-range num">'+a+' '+money0(m.a)+' → '+b+' '+money0(m.b)+'</span></td>'+
          '<td class="r num m-vals">'+money0(m.a)+'</td>'+
          '<td class="r num m-vals">'+money0(m.b)+'</td>'+
          '<td class="r num m-delta '+cls(m.d)+'">'+sign(m.d)+'</td>'+
          '<td class="r num m-pct '+cls(m.d)+'">'+(m.pct===null?'new':(m.pct>=0?'+':'')+m.pct.toFixed(0)+'%')+'</td></tr>';
      }).join('')+'</tbody></table></div>';
  }
  out.innerHTML=swing+'<p class="verdictline">'+line+'</p>'+
    table(1,'Expenditure movers','mvExpWrap')+table(0,'Revenue movers','mvRevWrap');
}
var cmpYearA=null,cmpYearB=null;
function openCompareModal(opener){
  MODAL.kind='compare';MODAL.opener=opener||null;
  if(cmpYearA===null){cmpYearA=O.years[O.years.length-2];cmpYearB=O.years[O.years.length-1];}
  document.getElementById('mTabs').innerHTML='';
  document.getElementById('mEyebrow').textContent='Annual filings · Niagara County';
  document.getElementById('mTitle').textContent='Compare two years';
  document.getElementById('mBig').innerHTML='<span>What moved between them — and which categories grew faster than revenue did.</span>';
  document.getElementById('mBody').innerHTML=
    '<div class="cmpbar">'+
      '<label>From <select id="cmpA"></select></label>'+
      '<label>to <select id="cmpB"></select></label>'+
      '<button class="pill" id="cmpPrev" type="button">Previous pair</button>'+
      '<button class="pill" id="cmpNext" type="button">Next pair</button>'+
    '</div><div id="cmpOut"></div>';
  var A=document.getElementById('cmpA'),B=document.getElementById('cmpB');
  O.years.forEach(function(y){A.appendChild(new Option(y,y));B.appendChild(new Option(y,y));});
  A.value=cmpYearA;B.value=cmpYearB;
  function sync(){cmpYearA=+A.value;cmpYearB=+B.value;renderCompare();}
  A.addEventListener('change',sync);B.addEventListener('change',sync);
  function shift(step){
    var ia=O.years.indexOf(+A.value),ib=O.years.indexOf(+B.value);
    if(ia+step<0||ib+step>O.years.length-1)return;
    A.value=O.years[ia+step];B.value=O.years[ib+step];sync();
  }
  document.getElementById('cmpPrev').addEventListener('click',function(){shift(-1);});
  document.getElementById('cmpNext').addEventListener('click',function(){shift(1);});
  renderCompare();
  document.getElementById('modal').hidden=false;
  document.body.style.overflow='hidden';
  document.querySelector('#modal .xbtn').focus();
}
document.getElementById('cmpOpen').addEventListener('click',function(e){openCompareModal(e.currentTarget);});

/* ---- year panels (ported) ---- */
var RANK_TOP=8, rankOpen={rev:false,exp:false};
var selYear=O.latest;
function groupRank(list,open){
  if(open||list.length<=RANK_TOP+1) return list;
  var head=list.slice(0,RANK_TOP),tv=0;
  for(var i=RANK_TOP;i<list.length;i++)tv+=list[i][1];
  return head.concat([['All other ('+(list.length-RANK_TOP)+' categories)',tv]]);
}
function renderYear(yr){
  selYear=yr;
  var rc=O.revByYear[String(yr)]||[],ec=O.expByYear[String(yr)]||[];
  var rt=rc.reduce(function(s,x){return s+x[1];},0);
  var et=ec.reduce(function(s,x){return s+x[1];},0);
  document.getElementById('revTot').textContent=money0(rt);
  document.getElementById('expTot').textContent=money0(et);
  var basis=yr<O.schemaBreak?' · pre-'+O.schemaBreak+' reporting basis':'';
  document.getElementById('revSub').textContent=yr+' filing · '+rc.length+' categories'+basis;
  document.getElementById('expSub').textContent=yr+' filing · '+ec.length+' categories'+basis;
  [['revRank','revMore','rev',rc,'--rev',rt,0],
   ['expRank','expMore','exp',ec,'--exp',et,1]].forEach(function(cfg){
    var el=document.getElementById(cfg[0]),btn=document.getElementById(cfg[1]);
    var key=cfg[2],list=cfg[3],col=cfg[4],tot=cfg[5],sec=cfg[6];
    function toggle(){rankOpen[key]=!rankOpen[key];renderYear(selYear);}
    renderRank(el,groupRank(list,rankOpen[key]),col,tot,null,
      function(item,node){openModal(selYear,sec,item[0],col,node);},
      toggle);
    if(list.length>RANK_TOP+1){
      btn.hidden=false;
      btn.textContent=rankOpen[key]?'Show the top '+RANK_TOP
        :'Show all '+list.length+' categories';
      if(!btn.__wired){btn.__wired=true;btn.addEventListener('click',toggle);}
    } else btn.hidden=true;
  });
  [].forEach.call(document.querySelectorAll('.yp'),function(b){
    var on=+b.dataset.year===yr;
    b.classList.toggle('on',on);
    b.setAttribute('aria-selected',on?'true':'false');
  });
  if(typeof markTrendYear==='function') markTrendYear(yr);
}
(function(){
  var host=document.getElementById('yearPills');
  host.innerHTML=O.years.slice().reverse().map(function(y){
    return '<button class="yp" type="button" role="tab" data-year="'+y+'">'+y+'</button>';
  }).join('');
  host.addEventListener('click',function(e){
    var b=e.target.closest('.yp');
    if(b) renderYear(+b.dataset.year);
  });
  host.addEventListener('keydown',function(e){
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    var i=O.years.indexOf(selYear);
    var next=O.years[e.key==='ArrowRight'?Math.min(i+1,O.years.length-1):Math.max(i-1,0)];
    if(next!==selYear){
      renderYear(next);
      var el2=host.querySelector('.yp.on');
      if(el2){el2.focus();el2.scrollIntoView({block:'nearest',inline:'center'});}
      e.preventDefault();
    }
  });
})();

/* ---- the big trend, scrubbable (ported) ---- */
var markTrendYear;
function drawTrend(){
  var wrapEl=document.getElementById('trendWrap');
  var narrow=(wrapEl.clientWidth||window.innerWidth)<700;
  var W=narrow?400:900,H=300;
  var ml=narrow?46:64,mr=narrow?34:54,mt=14,mb=26;
  var fs=narrow?13:10.5;
  var yrs=O.years,rev=O.rev,exp=O.exp;
  var max=Math.max.apply(null,rev.concat(exp))*1.06;
  var x=function(i){return ml+(W-ml-mr)*(i/(yrs.length-1));};
  var y=function(v){return mt+(H-mt-mb)*(1-v/max);};
  var svg=document.getElementById('trend'),p=[];
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  svg.style.fontSize=fs+'px';
  var step=narrow?200000000:100000000;
  for(var g=0;g<=max;g+=step){
    p.push('<line class="gl" x1="'+ml+'" y1="'+y(g).toFixed(1)+'" x2="'+(W-mr)+'" y2="'+y(g).toFixed(1)+'"/>');
    p.push('<text class="ax" x="'+(ml-8)+'" y="'+(y(g)+fs/3).toFixed(1)+'" text-anchor="end" font-size="'+fs+'">$'+(g/1000000)+'M</text>');
  }
  var bi=yrs.indexOf(O.schemaBreak);
  if(bi>0){
    var bx=((x(bi)+x(bi-1))/2).toFixed(1);
    p.push('<line class="brk" x1="'+bx+'" y1="'+mt+'" x2="'+bx+'" y2="'+(H-mb)+'"/>');
    if(!narrow)
      p.push('<text class="ax" x="'+(+bx+5)+'" y="'+(mt+10)+'" font-size="'+fs+'">reporting basis changed '+O.schemaBreak+'</text>');
  }
  var every=narrow?10:5;
  yrs.forEach(function(yr,i){
    if(yr%every===0||i===yrs.length-1)
      p.push('<text class="ax" x="'+x(i).toFixed(1)+'" y="'+(H-mb+fs+4)+'" text-anchor="middle" font-size="'+fs+'">'+
        (narrow?String(yr).slice(2):yr)+'</text>');
  });
  function path(arr){return arr.map(function(v,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);}).join(' ');}
  p.push('<path class="ln" d="'+path(exp)+'" stroke="var(--exp)"/>');
  p.push('<path class="ln" d="'+path(rev)+'" stroke="var(--rev)"/>');
  var li=yrs.length-1;
  p.push('<text class="ax" x="'+(W-mr+6)+'" y="'+(y(rev[li])+3).toFixed(1)+'" fill="var(--rev)" font-size="'+fs+'" style="font-weight:700">Rev</text>');
  p.push('<text class="ax" x="'+(W-mr+6)+'" y="'+(y(exp[li])+3).toFixed(1)+'" fill="var(--exp)" font-size="'+fs+'" style="font-weight:700">Exp</text>');
  p.push('<g id="tsel" style="opacity:0"><line class="sel" y1="'+mt+'" y2="'+(H-mb)+'"/>'+
    '<circle class="dot" r="4" fill="var(--rev)"/><circle class="dot" r="4" fill="var(--exp)"/></g>');
  p.push('<g id="tcross" style="opacity:0"><line class="brk" y1="'+mt+'" y2="'+(H-mb)+'"/>'+
    '<circle class="dot" r="4.5" fill="var(--rev)"/><circle class="dot" r="4.5" fill="var(--exp)"/></g>');
  p.push('<rect id="thit" x="'+ml+'" y="'+mt+'" width="'+(W-ml-mr)+'" height="'+(H-mt-mb)+'" fill="transparent"/>');
  svg.innerHTML=p.join('');
  var tip=document.getElementById('trendTip'),wrap=document.getElementById('trendWrap');
  var cross=document.getElementById('tcross');
  var cl=cross.querySelector('line'),cd=cross.querySelectorAll('circle');
  function move(ev){
    var r=svg.getBoundingClientRect();
    var px=(ev.clientX-r.left)/r.width*W;
    var i=Math.round((px-ml)/((W-ml-mr)/(yrs.length-1)));
    i=Math.max(0,Math.min(yrs.length-1,i));
    cross.style.opacity=1;
    cl.setAttribute('x1',x(i));cl.setAttribute('x2',x(i));
    cd[0].setAttribute('cx',x(i));cd[0].setAttribute('cy',y(rev[i]));
    cd[1].setAttribute('cx',x(i));cd[1].setAttribute('cy',y(exp[i]));
    var net=rev[i]-exp[i];
    tip.innerHTML='<div class="ty num">'+yrs[i]+'</div>'+
      '<div class="tl"><span><b style="background:var(--rev)"></b>Revenue</span><span class="num">'+money0(rev[i])+'</span></div>'+
      '<div class="tl"><span><b style="background:var(--exp)"></b>Expenditure</span><span class="num">'+money0(exp[i])+'</span></div>'+
      '<div class="tl" style="margin-top:3px;border-top:1px solid var(--rule);padding-top:3px">'+
        '<span>Net</span><span class="num" style="color:'+(net<0?'var(--bad)':'var(--ok)')+'">'+money0(net)+'</span></div>';
    tip.style.opacity=1;
    var wx=x(i)/W*wrap.clientWidth;
    tip.style.left=Math.min(Math.max(wx-tip.offsetWidth/2,0),wrap.clientWidth-tip.offsetWidth)+'px';
    tip.style.top='4px';
  }
  var hit=document.getElementById('thit');
  hit.addEventListener('mousemove',move);
  hit.addEventListener('mouseleave',function(){tip.style.opacity=0;tip.style.left='0px';cross.style.opacity=0;});
  hit.style.cursor='crosshair';
  function idxAt(clientX){
    var rr=svg.getBoundingClientRect();
    var i=Math.round(((clientX-rr.left)/rr.width*W-ml)/((W-ml-mr)/(yrs.length-1)));
    return Math.max(0,Math.min(yrs.length-1,i));
  }
  hit.addEventListener('click',function(ev){
    renderYear(yrs[idxAt(ev.clientX)]);
  });
  hit.style.touchAction='none';
  var dragging=false;
  function touchAt(ev){
    var t=ev.touches&&ev.touches[0];if(!t)return;
    move({clientX:t.clientX});
    var i=idxAt(t.clientX);
    if(yrs[i]!==selYear) renderYear(yrs[i]);
  }
  hit.addEventListener('touchstart',function(ev){dragging=true;touchAt(ev);ev.preventDefault();},{passive:false});
  hit.addEventListener('touchmove',function(ev){if(dragging){touchAt(ev);ev.preventDefault();}},{passive:false});
  hit.addEventListener('touchend',function(){dragging=false;tip.style.opacity=0;tip.style.left='0px';cross.style.opacity=0;});
  var sel=document.getElementById('tsel');
  var sl=sel.querySelector('line'),sd=sel.querySelectorAll('circle');
  markTrendYear=function(yr){
    var i=yrs.indexOf(yr);
    if(i<0){sel.style.opacity=0;return;}
    sl.setAttribute('x1',x(i));sl.setAttribute('x2',x(i));
    sd[0].setAttribute('cx',x(i));sd[0].setAttribute('cy',y(rev[i]));
    sd[1].setAttribute('cx',x(i));sd[1].setAttribute('cy',y(exp[i]));
    sel.style.opacity=1;
  };
  markTrendYear(selYear);
  document.getElementById('trendSub').textContent=
    yrs[li]+' filing: revenue '+money0(rev[li])+' against expenditure '+money0(exp[li])+
    ' — a net of '+money0(rev[li]-exp[li])+'. Series covers '+yrs[0]+'–'+yrs[li]+'.';
  document.getElementById('trendNote').textContent=
    'OSC changed its reporting schema in '+O.schemaBreak+'. Both eras publish 15 columns under '+
    'different names, so the mapping is resolved by column name per era (the choice was validated '+
    'for continuity on the city series). Figures either side of the dashed line are not strictly comparable.';
}
drawTrend();
renderYear(selYear);
var rT;window.addEventListener('resize',function(){clearTimeout(rT);rT=setTimeout(function(){drawTrend();},150);});

/* ---- peers with metric toggle (ported) ---- */
(function(){
  var peers=O.peers||[];
  if(!peers.length)return;
  var METRIC={exp:'spending',rev:'revenue',tax:'county property tax'};
  function render(metric){
    var rows=peers.map(function(p){return {p:p,v:p[metric]/p.pop};})
      .sort(function(a,b){return b.v-a.v;});
    var max=rows[0].v;
    document.getElementById('peerRank').innerHTML=rows.map(function(r){
      var me=r.p.self;
      return '<div class="rk">'+
        '<span class="lb"'+(me?' style="font-weight:700"':' style="color:var(--muted)"')+'>'+
          esc(r.p.name)+(me?' <span class="num" style="color:var(--ok);font-weight:700;font-size:11px">THIS COUNTY</span>':'')+
          ' <span class="num" style="color:var(--faint);font-size:11px">'+
          r.p.pop.toLocaleString('en-US')+' residents</span></span>'+
        '<span class="vl num"'+(me?'':' style="color:var(--muted)"')+'>$'+
          Math.round(r.v).toLocaleString('en-US')+'</span>'+
        '<span class="tr"><i style="width:'+(r.v/max*100).toFixed(1)+'%;background:'+
          (me?'var(--exp)':'var(--rule-strong)')+'"></i></span>'+
        '<span class="pc num">$'+(r.p[metric]/1e6).toFixed(0)+'M total '+METRIC[metric]+'</span>'+
      '</div>';}).join('');
  }
  document.getElementById('peerSeg').addEventListener('click',function(e){
    var b=e.target.closest('button[data-peer]');if(!b)return;
    [].forEach.call(this.querySelectorAll('button'),function(x){
      x.setAttribute('aria-selected',x===b?'true':'false');});
    render(b.dataset.peer);
  });
  render('exp');
})();

/* ---- rail + pager (ported) ---- */
var links=[].slice.call(document.querySelectorAll('.rail a'));
var secs=links.map(function(a){return document.querySelector(a.getAttribute('href'));})
  .filter(function(s){return s;});
var names=links.map(function(a){return a.textContent.trim();});
var current=0;
var pager=document.getElementById('pager');
var pgUp=document.getElementById('pgUp'),pgDn=document.getElementById('pgDn');
var navUntil=0;
function paint(){
  links.forEach(function(a,i){a.classList.toggle('on',i===current);});
  document.getElementById('pgIdx').textContent=(current+1)+'/'+secs.length;
  document.getElementById('pgName').textContent=names[current];
  pgUp.disabled=current===0;
  pgDn.disabled=current===secs.length-1;
}
function syncNav(){
  if(performance.now()<navUntil){paint();return;}
  var yv=window.scrollY+92,best=0;
  secs.forEach(function(s,i){if(s.offsetTop<=yv)best=i;});
  current=best;
  paint();
}
function goSection(delta){
  var i=Math.max(0,Math.min(secs.length-1,current+delta));
  if(i===current)return;
  current=i;
  navUntil=performance.now()+900;
  window.scrollTo({top:Math.max(0,secs[i].offsetTop-56),behavior:'smooth'});
  paint();
}
pgUp.addEventListener('click',function(){goSection(-1);});
pgDn.addEventListener('click',function(){goSection(1);});
var hideT;
window.addEventListener('scroll',function(){
  syncNav();
  pager.classList.remove('away');
  clearTimeout(hideT);
  hideT=setTimeout(function(){pager.classList.add('away');},2400);
},{passive:true});
syncNav();
hideT=setTimeout(function(){pager.classList.add('away');},2400);
['pointerdown','keydown'].forEach(function(ev){
  document.addEventListener(ev,function(){pager.classList.remove('away');
    clearTimeout(hideT);hideT=setTimeout(function(){pager.classList.add('away');},2400);},{passive:true});
});

/* ---- bars grow once on view ---- */
(function(){
  if(REDUCED||!('IntersectionObserver' in window))return;
  var lists=[].slice.call(document.querySelectorAll('.rank'));
  lists.forEach(function(x){x.classList.add('pregrow');});
  var io=new IntersectionObserver(function(es){es.forEach(function(en){
    if(!en.isIntersecting)return;en.target.classList.remove('pregrow');io.unobserve(en.target);});},{threshold:.15});
  lists.forEach(function(x){io.observe(x);});
})();

/* ---- keyboard for row-like controls ---- */
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ')return;
  var t=e.target.closest('[data-rank],[data-exp],[data-acct],[data-other],[data-fl2],[data-fobj],[data-cclear],[data-mvlabel]');
  if(!t||t.tagName==='BUTTON'||t.tagName==='A')return;
  e.preventDefault();
  t.click();
});

/* ---- theme ---- */
var themeBtn=document.getElementById('theme');
function themeNow(){var c=document.documentElement.getAttribute('data-theme');
  if(!c)c=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';return c;}
function themeIcon(){themeBtn.innerHTML=themeNow()==='dark'
  ?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19"/></svg>'
  :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.2A8.3 8.3 0 0 1 9.8 3.6a8.3 8.3 0 1 0 10.6 10.6z"/></svg>';}
themeBtn.addEventListener('click',function(){
  var next=themeNow()==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('pl-theme',next);}catch(e){}
  themeIcon();
});
themeIcon();
})();
</script>
</body></html>"""

def _var_row(name, bud, act, mono_name=False):
    if act is None:
        return ('<tr><td class="m-name">{n}</td><td class="r num m-vals">${b:,.0f}</td>'
                '<td class="r num m-vals">—</td>'
                '<td class="r num m-delta">excluded</td><td class="r num m-pct">—</td></tr>'
               ).format(n=name, b=bud)
    d = act - bud
    pct = (d / bud * 100) if bud else 0
    cls = "up" if d > 0 else "dn"
    return ('<tr><td class="m-name">{n}</td><td class="r num m-vals">${b:,.0f}</td>'
            '<td class="r num m-vals">${a:,.0f}</td>'
            '<td class="r num m-delta {c}">{sg}${ad:,.0f}</td>'
            '<td class="r num m-pct {c}">{sgp}{p:.1f}%</td></tr>'
           ).format(n=name, b=bud, a=act, c=cls, sg="+" if d >= 0 else "−",
                    ad=abs(d), sgp="+" if d >= 0 else "", p=pct)


rt_rows, covered = [], set()
for r in budget_roots:
    nm = '{} <span class="fnt num">{}</span>'.format(esc(r["name"]), r["root"])
    if r["root"] == "A9900":
        rt_rows.append(_var_row(nm, r["approp"], None))
    else:
        rt_rows.append(_var_row(nm, r["approp"], actual_roots.get(r["root"], 0)))
    covered.add(r["root"])
for k in sorted(actual_roots):
    if k not in covered and k != "A9900":
        rt_rows.append(_var_row(
            '{} <span class="fnt">filed, not separately budgeted</span>'.format(k),
            0, actual_roots[k]))
a_act_cmp = sum(v for k, v in actual_roots.items() if k != "A9900")
a_bud_cmp = sum(r["approp"] for r in budget_roots if r["root"] != "A9900")
rt_rows.append(_var_row("<b>General Fund total (excl. transfers)</b>", a_bud_cmp, a_act_cmp))
ROOTTABLE = ('<table class="mv"><thead><tr><th>Line</th><th class="r">Adopted</th>'
             '<th class="r">Actual</th><th class="r">Variance</th><th class="r">%</th>'
             '</tr></thead><tbody>' + "".join(rt_rows) + "</tbody></table>")

fd_rows = []
for name, pfx, bud in BUDGET_FUND_MAP:
    fd_rows.append(_var_row(esc(name), bud, actual_funds.get(pfx, 0)))
FUNDTABLE = ('<table class="mv"><thead><tr><th>Fund</th><th class="r">Adopted</th>'
             '<th class="r">Actual</th><th class="r">Variance</th><th class="r">%</th>'
             '</tr></thead><tbody>' + "".join(fd_rows) + "</tbody></table>")
UNB = " · ".join('{} <span class="num">${:,.0f}</span>'.format(k, v) for k, v in UNBUDGETED)

recip_rows = "".join(
    '<div class="rk"><span class="lb">{name}<span class="clsch">{cls}</span>{nf}</span>'
    '<span class="vl num">${amt:,.0f}</span>'
    '<span class="tr"><i style="width:{w:.1f}%;background:var(--exp)"></i></span>'
    '<span class="pc num">{share:.1f}% of the pot</span></div>'.format(
        name=r["name"], cls=r["cls"].upper(),
        nf=(' <span class="fnt">+ its own city sales tax, separate</span>'
            if r["name"] == "Niagara Falls" else ""),
        amt=r["amt"], w=r["amt"] / recips[0]["amt"] * 100,
        share=r["amt"] / recip_sum * 100)
    for r in recips)
dist_vals = [dist_series.get(y, 0) for y in yrs]

out = (TEMPLATE
       .replace("__BY__", str(BUDGET_YEAR))
       .replace("__APRINT__", "${:,.0f}".format(A_PRINTED))
       .replace("__ALLPRINT__", "${:,.0f}".format(ALL_PRINTED))
       .replace("__ROOTTABLE__", ROOTTABLE)
       .replace("__FUNDTABLE__", FUNDTABLE)
       .replace("__UNBUDGETED__", UNB)
       .replace("__SPARK__", spark_path(dist_vals))
       .replace("__RECIPROWS__", recip_rows)
       .replace("__SHAREDYEAR__", str(shared_year))
       .replace("__COUNTYLINE__", "${:,.0f}".format(county_line))
       .replace("__RECIPSUM__", "${:,.0f}".format(recip_sum))
       .replace("__GAPPCT__", "%.2f" % gap_pct)
       .replace("__NFOWN__", "${:,.0f}".format(nf_own))
       .replace("__DISTLATEST__", "${:,.0f}".format(dist_series.get(latest, 0)))
       .replace("__Y0__", str(yrs[0])).replace("__Y1__", str(yrs[-1]))
       .replace("__YEARS__", str(len(yrs)))
       .replace("__LATEST__", str(latest))
       .replace("__NETCOL__", "var(--bad)" if net < 0 else "var(--ok)")
       .replace("__SCALE__", "%.0f" % (rl / nt_rev))
       .replace("__PEERYEAR__", str(peer_year))
       .replace("__NROWS__", "{:,}".format(len(flows)))
       .replace("__PAYLOAD__", json.dumps(payload, separators=(",", ":"))))

path = os.path.join(ROOT, "county.html")
with open(path, "w", encoding="utf-8") as f:
    f.write(out)
print("wrote %s (%.0f KB) - %d years, %d flow rows, latest %d "
      "(rev ${:,.0f} / exp ${:,.0f}), peer year %d".format(rl, el)
      % (path, os.path.getsize(path) / 1024, len(yrs), len(flows), latest, peer_year))
