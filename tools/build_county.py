"""The County Edition: Niagara County's 31 years of filings to the NYS
Comptroller, rendered in Public Ledger's language. Emits county.html.

Same parser discipline as build_osc.py (this file deliberately repeats it
rather than importing a script): resolve the 2013 schema break by column
NAME per era, join on MUNICIPAL_CODE never ENTITY_NAME, and skip the
balance-sheet sections that would double every total.

No register here, and the page says why: the county does not publish its
claims abstract, so this edition is the filings story only. The checkbook
side exists the day the county posts (or shares) the abstract.
"""
import csv
import io
import json
import os
import statistics
import zipfile
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = os.path.join(ROOT, "data", "osc", "county_all_years.zip")
NC = "290100000000"                     # County of Niagara - pinned by code
FLOWS = ("REVENUE", "EXPENDITURE")
SEGMENT_MAP = {"REVENUES": "REVENUE", "EXPENDITURES": "EXPENDITURE"}
SCHEMA_BREAK = 2013

# 2020 Census (P1) populations; the peer set is the WNW ring plus the
# closest population matches elsewhere in upstate.
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


dicts = {"l1": [], "l2": [], "narr": []}
didx = {k: {} for k in dicts}


def di(kind, val):
    val = title_label((val or "").strip()) or "Unclassified"
    m = didx[kind]
    if val not in m:
        m[val] = len(dicts[kind])
        dicts[kind].append(val)
    return m[val]


series, flows = {}, []
cats = {"REVENUE": {}, "EXPENDITURE": {}}
peer_tot = defaultdict(lambda: defaultdict(float))   # year -> name -> {rev,exp,tax}
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
            k = (yr, ent)
            peer_tot[yr][ent + "|" + sec] += amt
            if sec == "REVENUE" and (r.get("LEVEL_1_CATEGORY") or "").upper().startswith("REAL PROPERTY TAX"):
                peer_tot[yr][ent + "|TAX"] += amt
        if r["MUNICIPAL_CODE"] != NC:
            continue
        found = True
        tot[sec] += amt
        bycat[sec][title_label(r.get("LEVEL_1_CATEGORY") or "Unclassified")] += amt
        flows.append([
            yr, 0 if sec == "REVENUE" else 1,
            di("l1", r.get("LEVEL_1_CATEGORY")),
            di("l2", r.get("LEVEL_2_CATEGORY")),
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

# peer year: the latest year where EVERY peer has both flows on file
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


def all_cats(sec, yr):
    d = sorted(cats[sec][yr].items(), key=lambda x: -x[1])
    return [[k, v] for k, v in d]


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


def money0(v):
    return "${:,.0f}".format(round(v))


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---- movers, latest pair, computed at build time ---------------------------
a, b = latest - 1, latest


def movers(sec):
    A, B = cats[sec][a], cats[sec][b]
    keys = set(A) | set(B)
    out = [{"k": k, "a": A.get(k, 0), "b": B.get(k, 0), "d": B.get(k, 0) - A.get(k, 0)}
           for k in keys]
    out.sort(key=lambda x: -abs(x["d"]))
    return out[:6]


def mover_rows(sec):
    rows = ""
    for m in movers(sec):
        pct = (" %+.0f%%" % (m["d"] / m["a"] * 100)) if m["a"] else " new"
        rows += ('<div class="mv"><span class="lb">%s</span>'
                 '<span class="vl num %s">%s%s</span></div>'
                 % (esc(m["k"]), "dn" if m["d"] < 0 else "up",
                    ("−" if m["d"] < 0 else "+") + money0(abs(m["d"])), pct))
    return rows


rl, el = series[latest]["rev"], series[latest]["exp"]
net = rl - el
med_prior = statistics.median(series[y]["rev"] for y in yrs[:-1])

HTML = r"""<!doctype html>
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
  --gridline:#e6e1d6;--desk:#e9e3d5}
:root[data-theme="dark"]{--paper:#14171c;--card:#191d23;--ink:#e8e6df;--muted:#a6aab2;
  --faint:#787d86;--rule:#262b33;--rule-strong:#343b45;--accent:#a9c3e2;--accent-soft:#1f2733;
  --rev:#4a8cc4;--exp:#b8822f;--ok:#4cc38a;--ok-soft:#132a20;--bad:#ff7a76;
  --gridline:#232a31;--desk:#0a0c0f}
*{box-sizing:border-box}
html{border-top:5px solid var(--accent);background:var(--desk);-webkit-tap-highlight-color:transparent}
body{margin:0;background:var(--desk);color:var(--ink);
  font:14px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.num{font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
::selection{background:color-mix(in srgb,var(--accent) 24%,transparent)}
a{color:var(--accent);text-underline-offset:2.5px;text-decoration-thickness:1px}
button:focus-visible,a:focus-visible,[role="button"]:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.page{max-width:920px;margin:26px auto 60px;padding:34px 38px 44px;background:var(--paper);
  border-radius:3px;box-shadow:0 0 0 1px var(--rule-strong),0 26px 70px -32px rgba(20,18,10,.45)}
@media (max-width:700px){.page{margin:0;border-radius:0;box-shadow:none;padding:22px 16px 40px}}
.mast{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;border-bottom:3px double var(--rule-strong);padding-bottom:12px}
.mark{font:600 26px/1 'Fraunces',ui-serif,Georgia,serif}.mark span{color:var(--accent)}
.edition{font:700 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;color:var(--exp);
  border:1.5px solid var(--exp);border-radius:4px;padding:4px 7px}
.mast .meta{margin-left:auto;font-size:12px;color:var(--faint);text-align:right}
.mast .meta b{color:var(--muted)}
@media (max-width:700px){.mast .meta{margin-left:0;text-align:left}}
h1{font:600 30px/1.15 'Fraunces',ui-serif,Georgia,serif;margin:20px 0 6px}
.lede{color:var(--muted);font-size:14px;max-width:74ch;margin:0 0 18px}
.lede b{color:var(--ink)}
h2{font:600 11px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);
  margin:30px 0 10px;display:flex;gap:12px;align-items:center}
h2::after{content:'';flex:1;height:1px;background:var(--rule)}
.hcard{background:var(--card);border:1px solid var(--rule-strong);border-radius:12px;
  padding:14px 18px 4px;max-width:560px;box-shadow:0 10px 30px -18px rgba(20,18,10,.3)}
.hrow{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:7px 0}
.hrow .k{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);font-weight:600}
.hrow .v{font:600 24px/1 'Fraunces',ui-serif,Georgia,serif}
.hrow:nth-child(2){border-bottom:1px solid var(--rule-strong);padding-bottom:13px}
.hrow:nth-child(3){padding-top:11px}
.hrow .v.closed{border-bottom:3px double var(--rule-strong);padding-bottom:5px}
#hRev .v{color:var(--rev)} #hExp .v{color:var(--exp)}
.hfoot{margin:8px -18px 0;border-top:1px solid var(--rule);padding:9px 18px;font-size:12px;color:var(--muted)}
.chartwrap{position:relative}
svg.trend{display:block;width:100%;height:auto}
svg.trend text{fill:var(--faint);font-family:ui-monospace,Menlo,Consolas,monospace}
svg.trend .gl{stroke:var(--gridline)} svg.trend .brk{stroke:var(--rule-strong);stroke-dasharray:3 4}
.legend{display:flex;gap:16px;font-size:12px;color:var(--muted);margin:2px 0 8px}
.legend b{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.note{font-size:11.5px;color:var(--faint);margin:8px 0 0;max-width:80ch}
.years{display:flex;gap:5px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:thin}
.yp{flex:0 0 auto;border:1px solid var(--rule-strong);background:var(--card);color:var(--muted);
  border-radius:99px;padding:5px 11px;font:600 12px/1 ui-monospace,Menlo,Consolas,monospace;cursor:pointer}
.yp.on{background:var(--accent);border-color:var(--accent);color:var(--paper)}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:760px){.pair{grid-template-columns:1fr}}
.panel{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:15px 16px}
.panel h3{margin:0 0 2px;font-size:14.5px}
.panel h3 .tot{float:right;font-weight:600}
.panel .sub{color:var(--muted);font-size:12px;margin:0 0 10px}
.rank{display:flex;flex-direction:column;gap:9px}
.rk{display:grid;grid-template-columns:1fr auto;gap:3px 10px;align-items:baseline}
.rk .lb{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rk .vl{font-size:12.5px;font-weight:600}
.rk .tr{grid-column:1/-1;height:9px;background:var(--gridline);border-radius:2px;overflow:hidden}
.rk .tr i{display:block;height:100%;border-radius:0 4px 4px 0;transition:width .55s cubic-bezier(.25,.9,.3,1)}
.rank.pregrow .rk .tr i{width:0!important}
@media (prefers-reduced-motion:reduce){.rk .tr i{transition:none}}
.rk .pc{font-size:11px;color:var(--faint);grid-column:1/-1;margin-top:-2px}
.rk.can{cursor:pointer;border-radius:6px;margin:0 -7px;padding:3px 7px}
.rk.can:hover{background:var(--accent-soft)}
.rk .see{color:var(--accent);font-weight:600;font-size:11.5px}
.pill{border:1px solid var(--rule-strong);background:transparent;color:var(--muted);border-radius:99px;
  padding:5px 11px;font-size:12px;cursor:pointer}
.pill:hover{color:var(--ink);border-color:var(--accent)}
.drill{grid-column:1/-1;background:var(--paper);border:1px solid var(--rule);border-radius:8px;
  padding:11px 13px;margin:4px 0 2px}
.drill h4{font:600 10px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:10px 0 7px}
.drill h4:first-child{margin-top:0}
.minis{display:flex;flex-direction:column;gap:6px}
.sb{display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:12.5px}
.sb .t{grid-column:1/-1;height:6px;background:var(--gridline);border-radius:2px;overflow:hidden}
.sb .t i{display:block;height:100%;border-radius:0 3px 3px 0}
.spark svg{display:block;width:100%;height:44px}
.acct{width:100%;font-size:12px;border-collapse:collapse}
.acct td{padding:4px 6px;border-bottom:1px dotted var(--rule-strong);vertical-align:top}
.acct tr:last-child td{border-bottom:0}
.acct .c{color:var(--faint);white-space:nowrap;width:1%}
.acct .a{text-align:right;white-space:nowrap;font-weight:600}
@media (max-width:640px){
  .acct,.acct tbody{display:block;width:100%}
  .acct tr{display:grid;grid-template-columns:1fr auto;gap:0 12px;padding:7px 0;border-bottom:1px dotted var(--rule-strong)}
  .acct td{display:block;padding:0;border:0;width:auto}
  .acct td:not(.c):not(.a){grid-row:1;grid-column:1;font-size:12.5px}
  .acct td.a{grid-row:1;grid-column:2}
  .acct td.c{grid-row:2;grid-column:1;font-size:11px}
}
details.more summary{list-style:none;cursor:pointer;color:var(--accent);font-weight:600;font-size:12px;padding:6px 0 0}
details.more summary::-webkit-details-marker{display:none}
.mvgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:760px){.mvgrid{grid-template-columns:1fr}}
.mv{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--rule);font-size:13px}
.mv:last-child{border-bottom:0}
.mv .vl.up{color:var(--exp)} .mv .vl.dn{color:var(--ok)}
#mvRev .mv .vl.up{color:var(--ok)} #mvRev .mv .vl.dn{color:var(--bad)}
.foot{border-top:1px solid var(--rule);margin-top:34px;padding-top:14px;font-size:12px;color:var(--faint)}
.foot p{margin:0 0 7px;max-width:88ch}
.backrow{margin-top:14px}
.backrow a{font-size:12.5px;text-decoration:none;border:1px solid var(--rule-strong);
  border-radius:99px;padding:6px 13px;background:var(--card)}
.themebtn{border:1px solid var(--rule-strong);background:transparent;color:var(--muted);border-radius:8px;
  width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;vertical-align:middle}
.themebtn svg{width:14px;height:14px}
</style></head><body>
<div class="page">
  <div class="mast">
    <div class="mark">Public <span>Ledger</span></div>
    <span class="edition">COUNTY EDITION</span>
    <div class="meta">Niagara County · filings <b>__Y0__–__Y1__</b> · source
      <a href="https://www.osc.ny.gov/local-government/data">NYS Comptroller</a>
      <button class="themebtn" id="theme" type="button" aria-label="Toggle theme"></button></div>
  </div>

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

  <h2>__YEARS__ years of revenue against spending</h2>
  <div class="legend"><span><b style="background:var(--rev)"></b>Revenue</span>
    <span><b style="background:var(--exp)"></b>Expenditure</span></div>
  <div class="chartwrap" id="trendWrap"></div>
  <p class="note">The dashed rule marks __BREAK__, where OSC changed its reporting schema —
    part of any change across that line is definitional. Figures as filed; no inflation adjustment.</p>

  <h2>The filing, year by year</h2>
  <div class="years" id="pills" role="tablist"></div>
  <div class="pair">
    <div class="panel">
      <h3>Revenue <span class="tot num" id="revTot" style="color:var(--rev)"></span></h3>
      <div class="sub" id="revSub"></div>
      <div class="rank" id="revRank"></div>
      <div style="margin-top:11px"><button class="pill" id="revMore" hidden></button></div>
    </div>
    <div class="panel">
      <h3>Expenditure <span class="tot num" id="expTot" style="color:var(--exp)"></span></h3>
      <div class="sub" id="expSub"></div>
      <div class="rank" id="expRank"></div>
      <div style="margin-top:11px"><button class="pill" id="expMore" hidden></button></div>
    </div>
  </div>
  <p class="note">Select any category for its make-up, its __YEARS__-year history and every
    account line behind it. &ldquo;All other&rdquo; always opens — nothing here is truncated.</p>

  <h2>What moved, __PREV__ &rarr; __LATEST__</h2>
  <div class="mvgrid">
    <div class="panel" id="mvExp"><h3>Spending movers</h3><div class="sub">largest changes, dollars</div>__MOVEXP__</div>
    <div class="panel" id="mvRev"><h3>Revenue movers</h3><div class="sub">largest changes, dollars</div>__MOVREV__</div>
  </div>

  <h2>Nine counties, per resident <span class="num" style="letter-spacing:0">__PEERYEAR__</span></h2>
  <div class="panel">
    <div class="sub">Each county&rsquo;s own __PEERYEAR__ filing, divided by its 2020 Census population.
      Counties differ in what they run — context, not a scorecard.</div>
    <div class="rank" id="peerRank"></div>
  </div>

  <div class="foot">
    <p><b>Method.</b> Parsed from the NYS Comptroller&rsquo;s statewide county filing data
      (<span class="num">__NROWS__</span> account-level rows for Niagara County, __Y0__–__Y1__),
      joined on municipal code, flows only — balance-sheet rows excluded. Self-reported AFR data:
      OSC desk-reviews these filings but does not audit them. Peer populations: 2020 Census (P1).</p>
    <p>Part of <a href="./">Public Ledger</a> — the City of North Tonawanda edition carries the
      reconciled warrant register, council briefs and the exception report.</p>
    <div class="backrow"><a href="./">&larr; Public Ledger — the city edition</a></div>
  </div>
</div>
<script id="cdata" type="application/json">__PAYLOAD__</script>
<script>
(function(){
"use strict";
var O=JSON.parse(document.getElementById('cdata').textContent);
var FD=O.dict, F=O.flows;
var FI_YR=0,FI_SEC=1,FI_L1=2,FI_L2=3,FI_NARR=4,FI_ACCT=5,FI_AMT=6;
var REDUCED=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
function money0(v){return '$'+Math.round(v).toLocaleString('en-US');}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* hero roll-up */
function roll(el,target,fmt){
  if(REDUCED){el.textContent=fmt(target);return;}
  var t0=performance.now(),D=750;
  (function tick(t){var p=Math.min(1,(t-t0)/D);p=1-Math.pow(1-p,3);
    el.textContent=fmt(Math.round(target*p));if(p<1)requestAnimationFrame(tick);})(t0);
}
var li=O.years.length-1, rl=O.rev[li], el=O.exp[li], net=rl-el;
roll(document.getElementById('hRevV'),rl,money0);
roll(document.getElementById('hExpV'),el,money0);
roll(document.getElementById('hNetV'),Math.abs(net),function(v){return (net<0?'−':'+')+money0(v);});

/* trend */
function drawTrend(){
  var host=document.getElementById('trendWrap');
  var narrow=(host.clientWidth||900)<700;
  var W=narrow?400:900,H=narrow?280:300;
  var ml=narrow?46:62,mr=narrow?14:22,mt=12,mb=24,fs=narrow?13:10.5;
  var yrs=O.years,max=Math.max.apply(null,O.rev.concat(O.exp))*1.06;
  var x=function(i){return ml+(W-ml-mr)*(i/(yrs.length-1));};
  var y=function(v){return mt+(H-mt-mb)*(1-v/max);};
  var p=['<svg class="trend" viewBox="0 0 '+W+' '+H+'" style="font-size:'+fs+'px">'];
  for(var g=0;g<=4;g++){var gv=max*g/4;
    p.push('<line class="gl" x1="'+ml+'" y1="'+y(gv).toFixed(1)+'" x2="'+(W-mr)+'" y2="'+y(gv).toFixed(1)+'"/>');
    p.push('<text x="'+(ml-6)+'" y="'+(y(gv)+3.5).toFixed(1)+'" text-anchor="end">$'+Math.round(gv/1e6)+'M</text>');}
  var bi=yrs.indexOf(O.schemaBreak);
  if(bi>0) p.push('<line class="brk" x1="'+x(bi).toFixed(1)+'" y1="'+mt+'" x2="'+x(bi).toFixed(1)+'" y2="'+(H-mb)+'"/>');
  yrs.forEach(function(yy,i){ if(yy%5===0)
    p.push('<text x="'+x(i).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">'+yy+'</text>');});
  ['rev','exp'].forEach(function(k){
    var d=O[k].map(function(v,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);}).join(' ');
    p.push('<path d="'+d+'" fill="none" stroke="var(--'+k+')" stroke-width="2.2" vector-effect="non-scaling-stroke"/>');});
  p.push('</svg>');
  host.innerHTML=p.join('');
}
drawTrend();
var rT;window.addEventListener('resize',function(){clearTimeout(rT);rT=setTimeout(drawTrend,150);});

/* year panels with the all-other-opens law */
var TOP=8, open={rev:false,exp:false}, selYear=O.latest, drillOpen=null;
function group(list,isOpen){
  if(isOpen||list.length<=TOP+1) return list;
  var head=list.slice(0,TOP),tv=0;
  for(var i=TOP;i<list.length;i++)tv+=list[i][1];
  return head.concat([['All other ('+(list.length-TOP)+' categories)',tv]]);
}
function seriesFor(sec,label){
  return O.years.map(function(yy){
    var m=(sec?O.expByYear:O.revByYear)[String(yy)]||[];
    for(var i=0;i<m.length;i++) if(m[i][0]===label) return m[i][1];
    return 0;});
}
function sparkSVG(vals){
  var W=260,H=44,max=Math.max.apply(null,vals)||1;
  var x=function(i){return W*(i/(vals.length-1));},y=function(v){return H-3-(H-8)*(v/max);};
  var d=vals.map(function(v,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);}).join(' ');
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><path d="'+d+' L'+W+' '+H+' L0 '+H+' Z" fill="var(--exp)" opacity=".10"/><path d="'+d+'" fill="none" stroke="var(--exp)" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
}
function drillHTML(sec,label){
  var rows=[];
  for(var i=0;i<F.length;i++){var f=F[i];
    if(f[FI_YR]===selYear&&f[FI_SEC]===sec&&FD.l1[f[FI_L1]]===label) rows.push(f);}
  if(!rows.length) return '<div class="drill">No detail filed.</div>';
  var total=rows.reduce(function(s,f){return s+f[FI_AMT];},0);
  var m={};rows.forEach(function(f){var k=FD.l2[f[FI_L2]];m[k]=(m[k]||0)+f[FI_AMT];});
  var l2=Object.keys(m).map(function(k){return [k,m[k]];}).sort(function(a,b){return b[1]-a[1];});
  var mx=l2[0][1];
  var h='<div class="drill">';
  if(l2.length>1||(l2.length===1&&l2[0][0]!==label)){
    h+='<h4>Within '+esc(label)+'</h4><div class="minis">'+l2.map(function(x){
      return '<div class="sb"><span>'+esc(x[0])+'</span><span class="num">'+money0(x[1])+
        ' <span style="color:var(--faint)">'+(x[1]/total*100).toFixed(1)+'%</span></span>'+
        '<span class="t"><i style="width:'+(x[1]/mx*100).toFixed(1)+'%;background:var(--'+(sec?'exp':'rev')+')"></i></span></div>';
    }).join('')+'</div>';}
  h+='<h4>'+O.years.length+'-year history</h4><div class="spark">'+sparkSVG(seriesFor(sec,label))+'</div>';
  var sorted=rows.slice().sort(function(a,b){return b[FI_AMT]-a[FI_AMT];});
  var head=sorted.slice(0,10), tail=sorted.slice(10);
  var line=function(f){return '<tr><td class="c num">'+esc(f[FI_ACCT])+'</td><td>'+esc(FD.narr[f[FI_NARR]])+
    '</td><td class="a num">'+money0(f[FI_AMT])+'</td></tr>';};
  h+='<h4>'+rows.length+' account lines · '+selYear+'</h4><table class="acct"><tbody>'+
    head.map(line).join('')+'</tbody></table>';
  if(tail.length)
    h+='<details class="more"><summary>Show the other '+tail.length+' lines — '+
       money0(tail.reduce(function(s,f){return s+f[FI_AMT];},0))+'</summary>'+
       '<table class="acct"><tbody>'+tail.map(line).join('')+'</tbody></table></details>';
  return h+'</div>';
}
function renderPanels(){
  [['revRank','revMore','rev',0],['expRank','expMore','exp',1]].forEach(function(cfg){
    var host=document.getElementById(cfg[0]),btn=document.getElementById(cfg[1]);
    var key=cfg[2],sec=cfg[3];
    var list=(sec?O.expByYear:O.revByYear)[String(selYear)]||[];
    var tot=list.reduce(function(s,x){return s+x[1];},0);
    document.getElementById(key+'Tot').textContent=money0(tot);
    document.getElementById(key+'Sub').textContent=selYear+' filing · '+list.length+' categories'+
      (selYear<O.schemaBreak?' · pre-'+O.schemaBreak+' basis':'');
    var shown=group(list,open[key]);
    var max=shown.reduce(function(m,x){return Math.max(m,x[1]);},0)||1;
    host.innerHTML=shown.map(function(x,i){
      var isOther=/^All other/.test(x[0]);
      var od=drillOpen&&drillOpen[0]===sec&&drillOpen[1]===x[0];
      return '<div class="rk can" data-i="'+i+'" data-other="'+(isOther?1:0)+'" role="button" tabindex="0">'+
        '<span class="lb"'+(isOther?' style="color:var(--muted)"':'')+'>'+esc(x[0])+
          (isOther?' <span class="see">— view all</span>':'')+'</span>'+
        '<span class="vl num">'+money0(x[1])+'</span>'+
        '<span class="tr"><i style="width:'+(x[1]/max*100).toFixed(1)+'%;background:'+
          (isOther?'var(--rule-strong)':'var(--'+key+')')+'"></i></span>'+
        '<span class="pc num">'+(tot?(x[1]/tot*100).toFixed(1):0)+'% of total</span>'+
      '</div>'+(od?drillHTML(sec,x[0]):'');
    }).join('');
    if(list.length>TOP+1){btn.hidden=false;
      btn.textContent=open[key]?'Show the top '+TOP:'Show all '+list.length+' categories';
    } else btn.hidden=true;
    if(!host.__wired){host.__wired=true;
      host.addEventListener('click',function(e){
        var t=e.target.closest('.rk');if(!t)return;
        var i=+t.getAttribute('data-i');
        var cur=group((sec?O.expByYear:O.revByYear)[String(selYear)]||[],open[key]);
        if(t.getAttribute('data-other')==='1'){open[key]=true;renderPanels();return;}
        var label=cur[i][0];
        drillOpen=(drillOpen&&drillOpen[0]===sec&&drillOpen[1]===label)?null:[sec,label];
        renderPanels();
      });
      btn.addEventListener('click',function(){open[key]=!open[key];renderPanels();});
    }
  });
}
var pills=document.getElementById('pills');
pills.innerHTML=O.years.slice().reverse().map(function(y){
  return '<button class="yp'+(y===selYear?' on':'')+'" data-y="'+y+'" role="tab">'+y+'</button>';}).join('');
pills.addEventListener('click',function(e){
  var b=e.target.closest('.yp');if(!b)return;
  selYear=+b.getAttribute('data-y');drillOpen=null;
  [].forEach.call(pills.querySelectorAll('.yp'),function(x){x.classList.toggle('on',+x.getAttribute('data-y')===selYear);});
  renderPanels();
});
renderPanels();

/* peers */
(function(){
  var rows=O.peers.map(function(p){return {p:p,v:p.exp/p.pop};}).sort(function(a,b){return b.v-a.v;});
  var max=rows[0].v;
  document.getElementById('peerRank').innerHTML=rows.map(function(r){
    var me=r.p.self;
    return '<div class="rk"><span class="lb"'+(me?' style="font-weight:700"':' style="color:var(--muted)"')+'>'+
      esc(r.p.name)+' <span class="num" style="color:var(--faint);font-size:11px">'+
      r.p.pop.toLocaleString('en-US')+' residents</span></span>'+
      '<span class="vl num"'+(me?'':' style="color:var(--muted)"')+'>$'+Math.round(r.v).toLocaleString('en-US')+'</span>'+
      '<span class="tr"><i style="width:'+(r.v/max*100).toFixed(1)+'%;background:'+
        (me?'var(--exp)':'var(--rule-strong)')+'"></i></span>'+
      '<span class="pc num">$'+(r.p.exp/1e6).toFixed(0)+'M total spending</span></div>';}).join('');
})();

/* bars grow once on view */
(function(){
  if(REDUCED||!('IntersectionObserver' in window))return;
  var lists=[].slice.call(document.querySelectorAll('.rank'));
  lists.forEach(function(x){x.classList.add('pregrow');});
  var io=new IntersectionObserver(function(es){es.forEach(function(en){
    if(!en.isIntersecting)return;en.target.classList.remove('pregrow');io.unobserve(en.target);});},{threshold:.15});
  lists.forEach(function(x){io.observe(x);});
})();

/* keyboard + theme */
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ')return;
  var t=e.target.closest('.rk.can');if(!t)return;e.preventDefault();t.click();
});
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
  themeIcon();});
themeIcon();
})();
</script>
</body></html>"""

# the city comparison reads NT's own latest filing, not a hardcode
nt = json.load(open(os.path.join(ROOT, "data", "osc-data.json"), encoding="utf-8"))
nt_rev = nt["rev"][-1]

out = (HTML
       .replace("__Y0__", str(yrs[0])).replace("__Y1__", str(yrs[-1]))
       .replace("__YEARS__", str(len(yrs)))
       .replace("__LATEST__", str(latest)).replace("__PREV__", str(latest - 1))
       .replace("__NETCOL__", "var(--bad)" if net < 0 else "var(--ok)")
       .replace("__SCALE__", "%.0f" % (rl / nt_rev))
       .replace("__BREAK__", str(SCHEMA_BREAK))
       .replace("__MOVEXP__", mover_rows("EXPENDITURE"))
       .replace("__MOVREV__", mover_rows("REVENUE"))
       .replace("__PEERYEAR__", str(peer_year))
       .replace("__NROWS__", "{:,}".format(len(flows)))
       .replace("__PAYLOAD__", json.dumps(payload, separators=(",", ":"))))

path = os.path.join(ROOT, "county.html")
with open(path, "w", encoding="utf-8") as f:
    f.write(out)
print("wrote %s (%.0f KB) - %d years, %d flow rows, latest %d "
      "(rev %s / exp %s), peer year %d"
      % (path, os.path.getsize(path) / 1024, len(yrs), len(flows), latest,
         money0(rl), money0(el), peer_year))
