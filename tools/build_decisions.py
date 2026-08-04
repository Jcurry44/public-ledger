"""Render decisions.html - the Niagara County Legislature resolutions register.

Reads data/resolutions.json (built by build_resolutions.py). Standalone page in
the product's own language: Fraunces, paper/ink, count-up hero, findings, a
searchable drillable register, and an ink method band with the honesty notes.
Run manually after build_resolutions.py.
"""
import io
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "data" / "resolutions.json").read_text(encoding="utf-8"))
S = DATA["summary"]
RECS = DATA["resolutions"]

def money0(v):
    return "${:,.0f}".format(v)

# ---- build-time findings ---------------------------------------------------
n_vote = S["vote_matched"]
n_unan = S["unanimous"]
unan_pct = round(100 * n_unan / max(1, n_vote))
dissent = [d for d in S["dissent"] if d[1] >= 2][:5]
dmax = dissent[0][1] if dissent else 1

caps = [r["cap"] for r in RECS if "cap" in r]
cap_total = sum(caps)
import re as _re
_MID = _re.compile(r"^(AND|AND/OR|OR|NOW,|PROVIDING|IN\s+RELATION|THEREFORE|THERETO|OF\s+THE)")
def _clean_title(r):
    t = r["title"]
    return (not t.startswith("(title not") and len(t) >= 12
            and not _MID.match(t) and not t.rstrip().endswith(":"))
top_caps = sorted((r for r in RECS if "cap" in r and _clean_title(r)), key=lambda r: -r["cap"])[:5]

by_cm = Counter(r["cm"] for r in RECS)
cm_names = S["committees"]

by_year_meet = defaultdict(set)
for r in RECS:
    by_year_meet[r["date"][:4]].add(r["date"])
years = sorted({r["date"][:4] for r in RECS}, reverse=True)

per_year_rows = []
by_year = defaultdict(list)
for r in RECS:
    by_year[r["date"][:4]].append(r)
for y in sorted(by_year, reverse=True):
    rs = by_year[y]
    v = sum(1 for r in rs if "vote" in r)
    a = sum(1 for r in rs if "cap" in r or "amt" in r)
    tx = sum(1 for r in rs if r.get("tx"))
    per_year_rows.append(
        f"<tr><td class='num'>{y}</td><td class='num'>{len(by_year_meet[y])}</td>"
        f"<td class='num'>{len(rs)}</td><td class='num'>{100*tx//len(rs)}%</td>"
        f"<td class='num'>{100*v//len(rs)}%</td>"
        f"<td class='num'>{100*a//len(rs)}%</td></tr>")

dissent_html = "".join(
    f"<div class='drow'><span class='dn'>{nm}</span>"
    f"<span class='dbar'><i style='width:{100*c/dmax:.0f}%'></i></span>"
    f"<span class='dc num'>{c}</span></div>"
    for nm, c in dissent) or "<p class='mut'>No legislator cast two or more recorded no votes.</p>"

topcap_html = "".join(
    f"<div class='crow'><span class='cv num'>{money0(r['cap'])}</span>"
    f"<span class='ct'>{r['title'][:90]}{'…' if len(r['title'])>90 else ''}"
    f"<span class='cid num'> {r['id']} · {r['date'][:4]}</span></span></div>"
    for r in top_caps)

# glossary lifted verbatim from build_county.py at build time - one source
GLOSS_JS = open(ROOT / "tools" / "build_county.py", encoding="utf-8").read()
_g0 = GLOSS_JS.index("var GLOSS={")
_g1 = GLOSS_JS.index("};", _g0) + 2
_g2 = GLOSS_JS.index("/* codes that mean different things", _g1)
_g3 = GLOSS_JS.index("return GLOSS[fn]||null;", _g2)
_g3 = GLOSS_JS.index("}", _g3) + 1
GLOSS_JS = GLOSS_JS[_g0:_g1] + "\n" + GLOSS_JS[_g2:_g3]
assert "'3101'" in GLOSS_JS

payload = json.dumps(DATA, separators=(",", ":")).replace("</", "<\\/")

HTML = r"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>The Decisions - Niagara County Legislature, __Y0__-__Y1__ | Public Ledger</title>
<meta name="description" content="Every resolution the Niagara County Legislature voted on, __Y0__-__Y1__: who moved it, who voted no, and what it authorized - parsed from the county's own meeting records.">
<meta property="og:title" content="The Decisions - Niagara County Legislature">
<meta property="og:description" content="__TOTAL__ resolutions, every recorded vote, every dollar authorized - parsed from the county's own minutes, __Y0__-__Y1__.">
<meta property="og:image" content="https://jcurry44.github.io/public-ledger/og-decisions.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<style>
@font-face{font-family:'Fraunces';src:url('fonts/Fraunces-600-latin.woff2') format('woff2');
  font-weight:600;font-style:normal;font-display:swap}
:root{--paper:#f6f2ea;--ink:#1e1c18;--muted:#5b564c;--faint:#8a8478;--rule:#dcd5c6;
  --rule-strong:#c8c0ae;--card:#fbf8f2;--accent:#7a5c2e;--ok:#3d6b40;--warn:#a04b2e;
  --gridline:#e7e1d3;--rev:#3d6b40;--exp:#8a4b2a;
  --cAD:#39557e;--cIF:#8a5a24;--cCSS:#7e3b3b;--cCS:#3d6b46;--cED:#5d4a7e;--cX:#6b675e}
:root[data-theme="dark"]{--paper:#161513;--ink:#e8e3d8;--muted:#a89f8f;--faint:#7a7264;
  --rule:#312e28;--rule-strong:#413d34;--card:#1d1b18;--accent:#c9a35e;--ok:#7fb884;
  --warn:#d98b64;--gridline:#26241f;--rev:#7fb884;--exp:#d98b64;
  --cAD:#7d9cc9;--cIF:#c99b5c;--cCSS:#c97d7d;--cCS:#7fb88a;--cED:#a48fc9;--cX:#9a948a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:#161513;--ink:#e8e3d8;
  --muted:#a89f8f;--faint:#7a7264;--rule:#312e28;--rule-strong:#413d34;--card:#1d1b18;
  --accent:#c9a35e;--ok:#7fb884;--warn:#d98b64;--gridline:#26241f;--rev:#7fb884;--exp:#d98b64;
  --cAD:#7d9cc9;--cIF:#c99b5c;--cCSS:#c97d7d;--cCS:#7fb88a;--cED:#a48fc9;--cX:#9a948a}}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);
  font:15px/1.55 Georgia,'Times New Roman',serif;-webkit-text-size-adjust:100%}
.num{font-family:'SF Mono',SFMono-Regular,ui-monospace,Menlo,Consolas,monospace;
  font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}
a{color:inherit}
h1,h2,h3,.serif{font-family:'Fraunces',Georgia,serif;font-weight:600;letter-spacing:-.01em}

.mast{border-bottom:2px solid var(--ink);padding:14px 0 10px}
.mrow{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.wordmark{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:19px;text-decoration:none}
.chip{font:600 10px/1 system-ui;letter-spacing:.12em;padding:4px 8px;border:1px solid var(--rule-strong);
  border-radius:3px;color:var(--muted);white-space:nowrap}
.mnav{margin-left:auto;display:flex;gap:14px;font:12px system-ui;flex-wrap:wrap}
.mnav a{color:var(--muted);text-decoration:none;border-bottom:1px solid transparent;padding-bottom:1px}
.mnav a:hover{color:var(--ink);border-bottom-color:var(--accent)}
#themeBtn{background:none;border:1px solid var(--rule-strong);border-radius:3px;color:var(--muted);
  cursor:pointer;font-size:12px;padding:3px 7px;line-height:1}

.hero{padding:44px 0 26px}
.eyebrow{font:600 11px/1 system-ui;letter-spacing:.16em;color:var(--faint);text-transform:uppercase}
.big{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:clamp(40px,8vw,72px);
  line-height:1.02;margin:10px 0 4px}
.big .num{font-family:'Fraunces',Georgia,serif}
.lede{max-width:66ch;color:var(--muted);font-size:16px}
.tally{display:flex;gap:26px;flex-wrap:wrap;margin-top:18px}
.tcell .tv{font-size:22px;font-weight:600}
.tcell .tl{font:600 10px/1.4 system-ui;letter-spacing:.1em;color:var(--faint);text-transform:uppercase}

.findings{border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);
  background:var(--card);padding:26px 0 30px;margin-top:8px}
.fgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:26px}
.fcell h3{margin:0 0 2px;font-size:17px}
.fcell .fk{font:600 10px/1.6 system-ui;letter-spacing:.12em;color:var(--faint);text-transform:uppercase}
.fbig{font-size:40px;font-weight:600;font-family:'Fraunces',Georgia,serif;line-height:1.05}
.fnote{color:var(--muted);font-size:13px;margin-top:4px}
.drow{display:flex;align-items:center;gap:10px;padding:4px 0}
.dn{width:96px;font-size:13px}
.dbar{flex:1;height:8px;background:var(--gridline);border-radius:2px;overflow:hidden}
.dbar i{display:block;height:100%;background:var(--warn);border-radius:0 2px 2px 0}
.dc{width:22px;text-align:right;font-weight:600;font-size:13px}
.crow{display:flex;gap:10px;padding:5px 0;border-bottom:1px dotted var(--rule);align-items:baseline}
.crow:last-child{border-bottom:0}
.cv{font-weight:600;white-space:nowrap;font-size:13.5px}
.ct{color:var(--muted);font-size:12.5px}
.cid{color:var(--faint);font-size:11px;white-space:nowrap}

/* topic band: click a bar to filter the register */
.tpband{margin-top:26px;border-top:1px solid var(--rule);padding-top:18px}
.tpband h3{margin:0 0 10px;font-size:17px}
.tprow{display:flex;align-items:center;gap:10px;padding:3px 0;cursor:pointer;border:0;
  background:none;width:100%;text-align:left;color:inherit;font:inherit}
.tprow .tl2{width:168px;font-size:13px;flex:none}
.tprow .tb{flex:1;height:10px;background:var(--gridline);border-radius:2px;overflow:hidden}
.tprow .tb i{display:block;height:100%;background:var(--exp);opacity:.75;border-radius:0 2px 2px 0;
  transition:opacity .15s}
.tprow:hover .tb i{opacity:1}
.tprow[aria-pressed="true"] .tb i{opacity:1;background:var(--accent)}
.tprow[aria-pressed="true"] .tl2{font-weight:700}
.tprow .tn{width:86px;text-align:right;font-size:12px;color:var(--muted);flex:none}
.tphint{color:var(--faint);font:11px system-ui;margin-top:6px}
.onesev{color:var(--muted);font-size:13px;margin:2px 0 12px;max-width:64ch}
.tag17{font:600 9px/1 system-ui;letter-spacing:.06em;color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);border-radius:8px;padding:2px 6px;margin-left:6px;white-space:nowrap}

/* contested votes */
.contested{padding:34px 0 6px}
.contested h2{font-size:26px;margin:0 0 4px}
.contested .csub{color:var(--muted);font-size:14px;margin:0 0 12px;max-width:70ch}
.split{display:inline-block;width:64px;height:8px;border-radius:2px;overflow:hidden;
  background:var(--warn);vertical-align:middle}
.split i{display:block;height:100%;background:var(--ok);border-radius:0}

/* year digest card */
.digest{background:var(--card);border:1px solid var(--rule);border-radius:8px;
  padding:14px 16px 12px;margin:14px 0 6px}
.digest .dgrid{display:flex;gap:24px;flex-wrap:wrap}
.digest .dcell .dv{font-size:20px;font-weight:600}
.digest .dcell .dl{font:600 9.5px/1.5 system-ui;letter-spacing:.09em;color:var(--faint);
  text-transform:uppercase}
.digest .dcm{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap}
.digest .dcmb{font:600 11px/1 system-ui;padding:5px 9px;border-radius:12px;cursor:pointer;
  border:1px solid var(--rule-strong);background:none;color:var(--muted)}
.digest .dcmb b{font-weight:700}
.mny,.acs{margin:10px 0 4px}
.mnh{font:600 10px/1.6 system-ui;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);
  margin-bottom:4px}
.mrow{display:flex;gap:8px;align-items:baseline;padding:3px 0;border-bottom:1px dotted var(--rule)}
.mrow:last-of-type{border-bottom:0}
.mk{flex:none;font:600 9px/1 system-ui;letter-spacing:.07em;padding:3px 6px;border-radius:3px;
  background:var(--gridline);color:var(--muted)}
.mk-cap{background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--accent)}
.mk-inc{background:color-mix(in srgb,var(--ok) 18%,transparent);color:var(--ok)}
.mk-dec{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}
.ms{flex:1;font-size:11.5px;color:var(--faint);font-style:italic;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mv{flex:none;font-weight:600;font-size:12.5px}
.mnote{font:11px system-ui;color:var(--faint);margin-top:5px}
.acp{margin:2px 4px 2px 0}
.acp .acg{font-weight:400;letter-spacing:0;text-transform:none}
@media (max-width:640px){
  .mrow{flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--rule)}
  .ms{flex-basis:100%;order:3;white-space:normal;margin-top:3px;padding-left:8px;
    border-left:2px solid var(--gridline)}
}
.tpclear{display:none;font:600 11px/1 system-ui;padding:6px 10px;border-radius:14px;
  border:1px solid var(--accent);background:none;color:var(--accent);cursor:pointer;margin-top:10px}
.tpclear.on{display:inline-block}

.reg{padding:34px 0 10px}
.controls{position:sticky;top:0;z-index:5;background:var(--paper);padding:10px 0 12px;
  border-bottom:1px solid var(--rule);margin-bottom:6px}
.searchrow{display:flex;gap:10px;align-items:center}
#q{flex:1;background:var(--card);border:1px solid var(--rule-strong);border-radius:6px;
  color:var(--ink);font:15px Georgia,serif;padding:9px 13px;min-width:0}
#q:focus{outline:2px solid var(--accent);outline-offset:-1px}
#qn{font:12px system-ui;color:var(--faint);white-space:nowrap}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.fch{font:600 11px/1 system-ui;letter-spacing:.04em;padding:6px 10px;border-radius:14px;
  border:1px solid var(--rule-strong);background:none;color:var(--muted);cursor:pointer}
.fch[aria-pressed="true"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.fch .n{opacity:.65;margin-left:3px}
.xrow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
.msel{background:var(--card);border:1px solid var(--rule-strong);border-radius:14px;
  color:var(--muted);font:600 11px system-ui;padding:6px 26px 6px 10px;cursor:pointer;
  -webkit-appearance:none;appearance:none;max-width:190px;
  background-image:url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23888'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 9px center}
.msel.on{background-color:var(--ink);color:var(--paper);border-color:var(--ink)}
.years{display:flex;gap:5px;overflow-x:auto;padding:10px 0 2px;scrollbar-width:thin}
.yb{font:600 12px/1 system-ui;padding:7px 11px;border-radius:5px;border:1px solid var(--rule-strong);
  background:none;color:var(--muted);cursor:pointer;white-space:nowrap}
.yb[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff}
.controls.searching .years{opacity:.35}

.jumpNote{background:var(--card);border:1px solid var(--rule);border-radius:6px;
  padding:9px 13px;font-size:13px;color:var(--muted);margin:12px 0 2px}
.mday{margin:22px 0 4px;display:flex;align-items:baseline;gap:10px}
.mday h3{margin:0;font-size:16px}
.mday .mn{font:11px system-ui;color:var(--faint)}
.rrow{border-bottom:1px solid var(--rule);padding:10px 2px;cursor:pointer}
.rrow:hover{background:var(--card)}
.rtop{display:flex;gap:10px;align-items:baseline}
.rid{font-size:11px;font-weight:600;padding:2px 6px;border-radius:3px;color:#fff;white-space:nowrap}
.rtitle{flex:1;font-size:14px;min-width:0}
.rbadges{display:flex;gap:6px;align-items:baseline;white-space:nowrap}
.vb{font-size:11.5px;font-weight:600;padding:2px 7px;border-radius:10px;
  background:var(--gridline);color:var(--muted)}
.vb.dis{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}
.vb.nov{background:none;border:1px dashed var(--rule-strong);color:var(--faint);font-weight:400}
.ab{font-size:11.5px;color:var(--accent);font-weight:600;white-space:nowrap}
.rext{display:none;padding:10px 4px 6px;color:var(--muted);font-size:13px;border-left:2px solid var(--rule-strong);
  margin:8px 0 2px 4px;padding-left:12px}
.rrow.open .rext{display:block}
.rext .vline{margin:0 0 6px}
.rext .srcs{margin-top:8px;display:flex;gap:8px;flex-wrap:wrap}
.pill{display:inline-block;font:600 11px/1 system-ui;letter-spacing:.05em;padding:6px 10px;
  border:1px solid var(--rule-strong);border-radius:14px;color:var(--muted);text-decoration:none}
.pill:hover{border-color:var(--accent);color:var(--ink)}
.morex{margin:16px 0 30px;text-align:center}
.mut{color:var(--muted)}

.method{margin-top:40px;padding:30px 0 34px;
  --paper:#22201c;--ink:#e8e3d8;--muted:#a89f8f;--faint:#7a7264;--rule:#3a362e;
  --rule-strong:#4a453a;--card:#2a2723;--accent:#c9a35e;--ok:#7fb884;
  background:#22201c;color:#e8e3d8}
:root[data-theme="dark"] .method{background:#101010;background:#0f0e0d}
.method h2{margin:0 0 10px;font-size:22px}
.method p{color:var(--muted);max-width:76ch;font-size:13.5px}
.method a{color:var(--accent)}
.gate{color:var(--ok);font:600 12px/1.5 system-ui}
.mtab{border-collapse:collapse;font-size:12.5px;margin:12px 0}
.mtab th{font:600 10px/1.4 system-ui;letter-spacing:.08em;text-transform:uppercase;
  color:var(--faint);text-align:right;padding:3px 12px 3px 0}
.mtab td{text-align:right;padding:2px 12px 2px 0;color:var(--muted);border-top:1px solid var(--rule)}
.mtab th:first-child,.mtab td:first-child{text-align:left}

.foot{padding:26px 0 44px;color:var(--faint);font:12px system-ui}
.foot a{color:var(--muted)}
@media (max-width:640px){
  .wrap{padding:0 14px}
  .rtop{flex-wrap:wrap}
  .rtitle{flex-basis:100%;order:3;margin-top:3px}
  .rbadges{margin-left:auto}
  .dn{width:84px}
  .mtab{width:100%}
  .mtab th,.mtab td{padding-right:8px}
  .mtabwrap{overflow-x:auto}
  .tally{gap:18px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
<script>
try{var t=localStorage.getItem('pl-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}
</script>
</head><body>

<header class="mast"><div class="wrap mrow">
  <a class="wordmark" href="./">Public Ledger</a>
  <span class="chip">THE DECISIONS</span>
  <nav class="mnav">
    <a href="legislators.html">The legislators</a>
    <a href="./">City ledger</a><a href="county.html">County edition</a>
    <a href="atlas.html">County atlas</a><a href="school.html">School district</a>
    <button id="themeBtn" aria-label="Toggle theme">&#9789;</button>
  </nav>
</div></header>

<section class="hero"><div class="wrap">
  <div class="eyebrow">Niagara County Legislature &middot; __Y0__&ndash;__Y1__</div>
  <div class="big"><span class="num" id="bigN" data-n="__TOTALN__">0</span> decisions</div>
  <p class="lede">The county can&rsquo;t spend a dollar, sign a contract, settle a claim, or move
  budget money without its Legislature voting on a numbered <b>resolution</b>. The
  <a href="county.html">county ledger</a> shows where the money went &mdash; this register is the
  record of who voted to send it. Every row below is parsed from the county&rsquo;s own published
  agendas and meeting minutes, and links back to the source document.</p>
  <div class="tally">
    <div class="tcell"><div class="tv num">__MEET__</div><div class="tl">Meetings</div></div>
    <div class="tcell"><div class="tv num">__RVPCT__%</div><div class="tl">Votes matched &middot; readable minutes</div></div>
    <div class="tcell"><div class="tv num">__UNAN__%</div><div class="tl">Passed unanimously</div></div>
    <div class="tcell"><div class="tv num">__CAPTOT__</div><div class="tl">Authorized ceilings</div></div>
  </div>
</div></section>

<section class="findings"><div class="wrap fgrid">
  <div class="fcell">
    <div class="fk">Finding 01 &middot; Consensus</div>
    <div class="fbig num">__UNAN__%</div>
    <h3>Nearly everything passes without a fight.</h3>
    <p class="fnote">Of the __VOTED__ resolutions with a recorded vote, __UNANN__ drew zero
    no votes. The interesting rows are the exceptions &mdash; use the register below to find them.</p>
  </div>
  <div class="fcell">
    <div class="fk">Finding 02 &middot; Dissent</div>
    <h3>Who actually votes no</h3>
    __DISSENT__
    <p class="fnote">Recorded no votes per legislator, __Y0__&ndash;__Y1__, as printed in the minutes.</p>
  </div>
  <div class="fcell">
    <div class="fk">Finding 03 &middot; The big authorizations</div>
    <h3>Largest &ldquo;not to exceed&rdquo; ceilings</h3>
    __TOPCAPS__
    <p class="fnote">Authorization ceilings are permission to spend up to an amount &mdash;
    they are not payments. The <a href="county.html">ledger</a> shows what was actually spent.</p>
  </div>
</div>
  <div class="wrap tpband">
    <div class="fk">Finding 04 &middot; What the votes are about</div>
    <h3>One in seven resolutions moves no money and takes no action.</h3>
    <p class="onesev">That claim is the <b>Symbolic &amp; advocacy</b> bar below: __SYMN__
    resolutions (__SYMPCT__%) that support, urge, oppose, honor or proclaim &mdash; positions,
    not spending.</p>
    <div id="tpBand"></div>
    <p class="tphint">Rule-based buckets matched on resolution titles &mdash; imperfect and said so.
    Select a bar to filter the register to that kind of decision.</p>
  </div>
</section>

<section class="reg" id="register"><div class="wrap">
  <h2 class="serif" style="font-size:26px;margin:0 0 14px">The register</h2>
  <div class="controls">
    <div class="searchrow">
      <input id="q" type="search" placeholder="Search __TOTAL__ resolutions &mdash; try &ldquo;mortgage tax&rdquo;, &ldquo;landfill&rdquo;, a vendor, a road&hellip;" aria-label="Search resolutions">
      <span id="qn"></span>
    </div>
    <div class="chips" id="cmChips"></div>
    <div class="xrow">
      <button class="fch" id="moneyChip" aria-pressed="false">$ Mentions dollars
        <span class="n num" id="moneyN"></span></button>
      <select class="msel" id="moverSel" aria-label="Filter by who moved it"></select>
    </div>
    <div class="years" id="yearRow"></div>
    <button class="tpclear" id="tpClear"></button>
  </div>
  <div class="digest" id="digest"></div>
  <div id="list"></div>
  <div class="morex"><button class="pill" id="moreBtn" style="cursor:pointer;background:none">Show more</button></div>
</div></section>

<section class="contested"><div class="wrap">
  <h2>Every contested vote</h2>
  <p class="csub">Twelve years and __TOTAL__ resolutions produced <b>__NCONT__</b> that drew a
  no vote. The newest are below &mdash; green is the ayes&rsquo; share.</p>
  <div id="contList"></div>
  <div class="morex"><button class="pill" id="contMore" style="cursor:pointer;background:none">Show all __NCONT__ contested votes</button></div>
</div></section>

<section class="method"><div class="wrap">
  <h2>How this register is built</h2>
  <p><b>Sources.</b> The Niagara County Legislature publishes agendas, resolution packets, and
  meeting minutes for every session at
  <a href="https://www.niagaracounty.gov/government/legislature/agendas_legislative_meetings/index.php">niagaracounty.gov</a>.
  This register parses the __Y0__&ndash;__Y1__ era &mdash; the years where full resolution texts and
  minutes are posted. Meetings from 2007&ndash;2014 are on the county site as agenda lists only,
  so they are deliberately excluded rather than shown half-built.</p>
  <p><b>The tie-out.</b> Each meeting&rsquo;s agenda prints its own list of resolution numbers.
  Every parsed resolution is checked against that list; the parse of a meeting fails loudly rather
  than publishing a partial read.</p>
  <p class="gate">&#10003; __TOTAL__ resolutions parsed across __MEET__ meetings &middot; every id tied out
  against its meeting&rsquo;s own agenda list &middot; __RVPCT__% of votes matched where minutes are
  machine-readable</p>
  <div class="mtabwrap"><table class="mtab"><thead><tr><th>Year</th><th>Meetings</th><th>Resolutions</th>
  <th>Text located</th><th>Votes matched</th><th>With amounts</th></tr></thead><tbody>__PERYEAR__</tbody></table></div>
  <p><b>What a machine cannot read.</b> Of the __TOTAL__ resolutions, __SCANROWS__ sit in meetings
  whose posted minutes are scanned images with no text layer, __NONEROWS__ in meetings where the
  county has not posted minutes at all, and __FUTROWS__ on agendas for meetings not yet held.
  Against the minutes a machine <i>can</i> read, __RVN__ of __RDN__ votes are matched
  (__RVPCT__%).__WBNOTE__ Nothing here is OCR-guessed &mdash; where the record is an image, this
  register says so and links it.</p>
  <p><b>Honesty notes.</b> The county&rsquo;s PDFs carry a machine text layer with light OCR noise
  (&ldquo;CmTied&rdquo; for &ldquo;Carried&rdquo;, the digit 1 read as the letter I); parsing tolerates
  the known artifacts and otherwise reports what is printed, including vote totals that occasionally
  disagree with the chamber&rsquo;s seat count. Dollar figures are read from the resolution text:
  &ldquo;up to&rdquo; amounts are <i>authorization ceilings</i>, other figures are amounts
  <i>mentioned</i> in the text (bid tabulations include losing bids) &mdash; neither is a payment
  record. Votes shown as unmatched simply were not found by the parser in that meeting&rsquo;s
  minutes; the minutes remain the authority.</p>
</div></section>

<footer class="foot"><div class="wrap">
  Public Ledger &middot; The Decisions &middot; built __BUILT__ from documents published by
  Niagara County &middot; <a href="county.html">county ledger</a> &middot; <a href="./">city ledger</a>
</div></footer>

<script id="R" type="application/json">__PAYLOAD__</script>
<script>
__GLOSSJS__
var R=JSON.parse(document.getElementById('R').textContent);
var CM=R.summary.committees, RECS=R.resolutions;
var CMCOLOR={AD:'--cAD',IF:'--cIF',CSS:'--cCSS',CS:'--cCS',ED:'--cED'};
var money0=function(v){return '$'+Math.round(v).toLocaleString('en-US');};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};

var byYear={}, years=[];
RECS.forEach(function(r){var y=r.date.slice(0,4);(byYear[y]=byYear[y]||[]).push(r);});
years=Object.keys(byYear).sort().reverse();
/* newest first; within a meeting, contested votes surface above the
   unanimous traffic */
function regCmp(a,b){
  if(a.date!==b.date) return a.date<b.date?1:-1;
  var ca=(a.vote&&a.vote.noes>0)?1:0, cb=(b.vote&&b.vote.noes>0)?1:0;
  if(ca!==cb) return cb-ca;
  return a.id<b.id?-1:1;
}
Object.keys(byYear).forEach(function(y){ byYear[y].sort(regCmp); });
var TPL={}; (R.summary.topics||[]).forEach(function(t){TPL[t[0]]=t[1];});
var CONTESTED=RECS.filter(function(r){return r.vote&&r.vote.noes>0;})
  .sort(function(a,b){return a.date<b.date?1:-1;});

var state={year:years[0], cm:'', tp:'', q:'', money:false, mover:'', shown:0};
var PAGE=120;

function cmColor(c){return 'var('+(CMCOLOR[c]||'--cX')+')';}
/* local date - toISOString is UTC and flips 'today' at 8pm Eastern */
var TODAY=(function(){var d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
function voteBadge(r){
  if(!r.vote){
    if(r.date>TODAY) return '<span class="vb nov">not yet held</span>';
    return '<span class="vb nov">no vote matched</span>';
  }
  var v=r.vote, cls=v.noes>0?'vb dis':'vb';
  var t=v.ayes+'&ndash;'+v.noes;
  if(v.absent) t+=' <span style="opacity:.65">('+v.absent+' abs)</span>';
  return '<span class="'+cls+'">'+t+'</span>';
}
function amtBadge(r){
  if(r.cap) return '<span class="ab num">up to '+money0(r.cap)+'</span>';
  if(r.amt) return '<span class="ab num" style="opacity:.75">'+money0(r.amt)+' in text</span>';
  return '';
}
function rowHTML(r,i,pool){
  var split='';
  if(pool==='c'){
    var v=r.vote, pc=100*v.ayes/(v.ayes+v.noes);
    split='<span class="split" title="'+v.ayes+' ayes, '+v.noes+' noes"><i style="width:'+pc.toFixed(0)+'%"></i></span> ';
  }
  return '<div class="rrow" data-i="'+i+'"'+(pool?' data-pool="'+pool+'"':'')+' tabindex="0" role="button" aria-expanded="false">'+
    '<div class="rtop">'+
      '<span class="rid num" style="background:'+cmColor(r.cm)+'">'+r.id+'</span>'+
      '<span class="rtitle">'+esc(r.title)+'</span>'+
      '<span class="rbadges">'+split+amtBadge(r)+voteBadge(r)+'</span>'+
    '</div><div class="rext"></div></div>';
}
function extHTML(r){
  var h='';
  var cm=r.cms||CM[r.cm]||('Committee '+r.cm);
  var fut=r.date>TODAY;
  h+='<p class="vline"><b>'+esc(cm)+'</b> &middot; '+
     (fut?'scheduled for '+fmtDate(r.date):'meeting of '+fmtDate(r.date))+
     (r.tp&&TPL[r.tp]&&r.tp!=='o'?' &middot; '+esc(TPL[r.tp]).toLowerCase():'')+'</p>';
  if(r.vote){
    var v=r.vote;
    var line=(v.out||'Adopted')+', '+v.ayes+' ayes to '+v.noes+' noes';
    if(v.absent) line+=', '+v.absent+' absent'+(v.abs_names?' ('+v.abs_names.join(', ')+')':'');
    if(v.no_names&&v.no_names.length) line+='. Voting no: <b>'+esc(v.no_names.join(', '))+'</b>';
    if(v.mover) line+='. Moved by '+esc(v.mover)+', seconded by '+esc(v.second)+'';
    h+='<p class="vline">'+line+'.</p>';
  } else if(fut){
    h+='<p class="vline">On the printed agenda for a meeting that hasn&rsquo;t been held yet &mdash; '+
       'the vote will appear here once the county posts the minutes.</p>';
  } else {
    var ms=(R.mstat||{})[r.date];
    if(ms==='scan')
      h+='<p class="vline">The minutes for this meeting are a scanned image with no text layer &mdash; '+
         'a machine can&rsquo;t read the vote. The linked PDF is the authority.</p>';
    else if(ms==='none')
      h+='<p class="vline">The county has not posted minutes for this meeting &mdash; no vote record '+
         'exists to read.</p>';
    else
      h+='<p class="vline">No vote line found for this item in the meeting&rsquo;s minutes &mdash; '+
         'the minutes PDF is the authority.</p>';
  }
  if(fut&&!(r.am&&r.am.length)&&!r.cap)
    h+='<p class="vline">The posted agenda lists this resolution by title only &mdash; dollar detail '+
       'arrives with the full packet.</p>';
  if(r.cap) h+='<p class="vline">Authorizes spending <b>up to '+money0(r.cap)+'</b> (a ceiling, not a payment).</p>';
  if(r.am&&r.am.length){
    var KL={cap:'CEILING',inc:'BUDGET +',dec:'BUDGET \u2212',awd:'AWARD',bid:'BID',
            ret:'RETURNED',rev:'REVENUE',m:'IN TEXT'};
    h+='<div class="mny"><div class="mnh">The money in this resolution</div>'+
      r.am.map(function(a2){
        return '<div class="mrow"><span class="mk mk-'+a2[1]+'">'+KL[a2[1]]+'</span>'+
          '<span class="ms">&ldquo;&hellip;'+esc(a2[2])+'&rdquo;</span>'+
          '<span class="mv num">'+money0(a2[0])+'</span></div>';
      }).join('')+
      (r.amtn>r.am.length?'<div class="mnote">+ '+(r.amtn-r.am.length)+' more amounts in the text &mdash; see the source PDF.</div>':'')+
      '<div class="mnote">Excerpts as printed. Ceilings are permission, budget rows move existing money, bids include losers.</div>'+
    '</div>';
  }
  if(r.ac&&r.ac.length){
    h+='<div class="acs"><div class="mnh">Accounts cited &mdash; trace them in the ledger</div>'+
      r.ac.map(function(c){
        var g=glossFor(c);
        return '<a class="pill acp" href="county.html#acct-'+c+'">'+c+
          (g?' &middot; <span class="acg">'+esc(g.split(' - ')[0].split(' \u2014 ')[0])+'</span>':'')+'</a>';
      }).join(' ')+
      '<div class="mnote">Opens that account&rsquo;s 31-year history on the county ledger.</div></div>';
  }
  h+='<div class="srcs"><a class="pill" target="_blank" rel="noopener" href="'+esc((R.sources&&R.sources[r.date])||'#')+'">Source PDF &#8599;</a>'+
     (r.ac&&r.ac.length?'<a class="pill" href="county.html#acct-'+r.ac[0]+'">Trace the money &rarr;</a>':'')+
     '</div>';
  return h;
}

function applyFilters(p){
  if(state.cm) p=p.filter(function(r){return r.cm===state.cm;});
  if(state.tp) p=p.filter(function(r){return (r.tp||'o')===state.tp;});
  if(state.money) p=p.filter(function(r){return r.cap||(r.am&&r.am.length);});
  if(state.mover) p=p.filter(function(r){return r.vote&&r.vote.mover===state.mover;});
  return p;
}
function pool(){
  var p;
  if(state.q.length>=2){
    var q=state.q.toLowerCase();
    p=RECS.filter(function(r){return (r.id+' '+r.title).toLowerCase().indexOf(q)>=0;});
    p=p.slice().sort(regCmp);
  } else {
    p=byYear[state.year]||[];
  }
  return applyFilters(p);
}
/* a filter that empties the current year jumps to the newest year that has
   matches - the chip counts span all twelve years, the click means "show me" */
function autoJump(){
  if(state.q.length>=2) return null;
  if(!(state.cm||state.tp||state.money||state.mover)) return null;
  if(pool().length) return null;
  for(var i=0;i<years.length;i++){
    if(applyFilters(byYear[years[i]]||[]).length){
      var from=state.year;
      state.year=years[i];
      yr.querySelectorAll('.yb').forEach(function(x){
        x.setAttribute('aria-pressed',x.getAttribute('data-y')===state.year);});
      return {to:years[i], from:from};
    }
  }
  return {none:true};
}
function render(more){
  var jump=more?null:autoJump();
  var p=pool();
  if(!more) state.shown=0;
  var upTo=Math.min(p.length, state.shown+PAGE);
  var h='', lastDate='';
  for(var i=0;i<upTo;i++){
    var r=p[i];
    if(!state.q && r.date!==lastDate){
      lastDate=r.date;
      var n=p.filter(function(x){return x.date===r.date;}).length;
      var fut=r.date>TODAY;
      h+='<div class="mday"><h3>'+fmtDate(r.date)+'</h3><span class="mn num">'+n+' resolutions'+
        (fut?' &middot; agenda posted, meeting not yet held':'')+'</span></div>';
    }
    h+=rowHTML(r,i,'');
  }
  state.shown=upTo;
  if(jump&&jump.to){
    h='<p class="jumpNote">No matches in '+jump.from+' &mdash; jumped to <b>'+jump.to+
      '</b>, the newest year with results.</p>'+h;
  }
  if(!h){
    var hasF=state.cm||state.tp||state.money||state.mover;
    h=hasF
      ?'<div style="padding:30px 0"><p class="mut">Nothing matches this combination of filters '+
        'in any year.</p><button class="pill" id="clearAll" style="cursor:pointer;background:none">'+
        'Clear filters</button></div>'
      :'<p class="mut" style="padding:30px 0">Nothing matches.</p>';
  }
  document.getElementById('list').innerHTML=h;
  var ca=document.getElementById('clearAll');
  if(ca) ca.addEventListener('click',function(){
    state.cm='';state.tp='';state.money=false;state.mover='';
    document.querySelectorAll('#cmChips .fch').forEach(function(x){
      x.setAttribute('aria-pressed',x.getAttribute('data-cm')==='');});
    document.querySelectorAll('#tpBand .tprow').forEach(function(x){x.setAttribute('aria-pressed','false');});
    var mc=document.getElementById('moneyChip'); mc.setAttribute('aria-pressed','false');
    var ms=document.getElementById('moverSel'); ms.value=''; ms.classList.remove('on');
    render();
  });
  document.getElementById('qn').textContent=state.q.length>=2?(p.length+' match'+(p.length===1?'':'es')):'';
  document.querySelector('.controls').classList.toggle('searching',state.q.length>=2);
  document.getElementById('moreBtn').style.display=upTo<p.length?'':'none';
  document.getElementById('moreBtn').textContent='Show '+Math.min(PAGE,p.length-upTo)+' more of '+p.length;
  window.__pool=p;
  var tc=document.getElementById('tpClear');
  tc.classList.toggle('on',!!state.tp);
  if(state.tp) tc.textContent='Filtered: '+(TPL[state.tp]||state.tp)+'  \u2715';
  renderDigest();
}
function renderDigest(){
  var el=document.getElementById('digest');
  if(state.q.length>=2){el.style.display='none';return;}
  el.style.display='';
  var y=state.year, rs=byYear[y]||[];
  var meets={}; rs.forEach(function(r){meets[r.date]=1;});
  var caps=rs.filter(function(r){return r.cap;});
  var capSum=caps.reduce(function(a,r){return a+r.cap;},0);
  var capMax=caps.reduce(function(a,r){return Math.max(a,r.cap);},0);
  var cont=rs.filter(function(r){return r.vote&&r.vote.noes>0;}).length;
  var sym=rs.filter(function(r){return r.tp==='s';}).length;
  var h='<div class="dgrid">'+
    '<div class="dcell"><div class="dv num">'+rs.length+'</div><div class="dl">Resolutions</div></div>'+
    '<div class="dcell"><div class="dv num">'+Object.keys(meets).length+'</div><div class="dl">Meetings</div></div>'+
    '<div class="dcell"><div class="dv num">'+(capSum?money0(capSum):'&mdash;')+'</div><div class="dl">Ceilings authorized</div></div>'+
    '<div class="dcell"><div class="dv num">'+(capMax?money0(capMax):'&mdash;')+'</div><div class="dl">Largest ceiling</div></div>'+
    '<div class="dcell"><div class="dv num">'+cont+'</div><div class="dl">Contested</div></div>'+
    '<div class="dcell"><div class="dv num">'+(rs.length?Math.round(100*sym/rs.length):0)+'%</div><div class="dl">Symbolic</div></div>'+
  '</div>';
  var byCm={}; rs.forEach(function(r){byCm[r.cm]=(byCm[r.cm]||0)+1;});
  var top=Object.keys(byCm).sort(function(a,b){return byCm[b]-byCm[a];}).slice(0,5);
  h+='<div class="dcm">'+top.map(function(c){
    return '<button class="dcmb" data-dcm="'+c+'"><b>'+esc(CM[c]||c)+'</b> '+byCm[c]+'</button>';
  }).join('')+'</div>';
  el.innerHTML=h;
}
function fmtDate(d){
  var mo=['January','February','March','April','May','June','July','August','September','October','November','December'];
  return mo[+d.slice(5,7)-1]+' '+(+d.slice(8))+', '+d.slice(0,4);
}

/* controls */
var yr=document.getElementById('yearRow');
yr.innerHTML=years.map(function(y){
  return '<button class="yb num" data-y="'+y+'" aria-pressed="'+(y===state.year)+'">'+y+'</button>';}).join('');
yr.addEventListener('click',function(e){
  var b=e.target.closest('[data-y]'); if(!b) return;
  state.year=b.getAttribute('data-y');
  yr.querySelectorAll('.yb').forEach(function(x){x.setAttribute('aria-pressed',x===b);});
  render();
});
var counts={};RECS.forEach(function(r){counts[r.cm]=(counts[r.cm]||0)+1;});
var order=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];});
var cc=document.getElementById('cmChips');
/* sub-threshold committee codes are OCR one-offs - rows keep their code,
   but they do not earn a filter chip */
cc.innerHTML='<button class="fch" data-cm="" aria-pressed="true">All</button>'+
  order.filter(function(c){return counts[c]>=10;}).map(function(c){
    return '<button class="fch" data-cm="'+c+'" aria-pressed="false">'+esc(CM[c]||c)+
      '<span class="n num">'+counts[c]+'</span></button>';}).join('');
cc.addEventListener('click',function(e){
  var b=e.target.closest('[data-cm]'); if(!b) return;
  state.cm=b.getAttribute('data-cm');
  cc.querySelectorAll('.fch').forEach(function(x){x.setAttribute('aria-pressed',x===b);});
  render();
});
var qEl=document.getElementById('q'), qt=null;
qEl.addEventListener('input',function(){
  clearTimeout(qt); qt=setTimeout(function(){state.q=qEl.value.trim();render();},140);
});
document.getElementById('moreBtn').addEventListener('click',function(){render(true);});
(function(){
  var mc=document.getElementById('moneyChip');
  var n=RECS.filter(function(r){return r.cap||(r.am&&r.am.length);}).length;
  document.getElementById('moneyN').textContent=n.toLocaleString('en-US');
  mc.addEventListener('click',function(){
    state.money=!state.money;
    mc.setAttribute('aria-pressed',state.money);
    render();
  });
  var ms=document.getElementById('moverSel');
  var movers={};
  RECS.forEach(function(r){if(r.vote&&r.vote.mover) movers[r.vote.mover]=(movers[r.vote.mover]||0)+1;});
  var names=Object.keys(movers).filter(function(n2){return movers[n2]>=5;})
    .sort(function(a,b){return movers[b]-movers[a];});
  ms.innerHTML='<option value="">Moved by: anyone</option>'+names.map(function(n2){
    return '<option value="'+esc(n2)+'">Moved by '+esc(n2)+' ('+movers[n2].toLocaleString('en-US')+')</option>';}).join('');
  ms.addEventListener('change',function(){
    state.mover=ms.value;
    ms.classList.toggle('on',!!state.mover);
    render();
  });
})();
document.getElementById('tpClear').addEventListener('click',function(){
  state.tp='';
  document.querySelectorAll('#tpBand .tprow').forEach(function(x){x.setAttribute('aria-pressed','false');});
  render();
});
document.getElementById('digest').addEventListener('click',function(e){
  var b2=e.target.closest('[data-dcm]'); if(!b2) return;
  var c=b2.getAttribute('data-dcm');
  var chip=document.querySelector('#cmChips [data-cm="'+c+'"]')||document.querySelector('#cmChips [data-cm=""]');
  chip.click();
});

/* topic band */
(function(){
  var tot=RECS.length;
  var band=document.getElementById('tpBand');
  var items=(R.summary.topics||[]).slice().sort(function(a,b){return b[2]-a[2];});
  var mx=items[0][2]||1;
  band.innerHTML=items.map(function(t){
    return '<button class="tprow" data-tp="'+t[0]+'" aria-pressed="false">'+
      '<span class="tl2">'+esc(t[1])+(t[0]==='s'?'<span class="tag17">the 1 in 7</span>':'')+'</span>'+
      '<span class="tb"><i style="width:'+(100*t[2]/mx).toFixed(1)+'%"></i></span>'+
      '<span class="tn num">'+t[2].toLocaleString('en-US')+' &middot; '+Math.round(100*t[2]/tot)+'%</span>'+
    '</button>';}).join('');
  band.addEventListener('click',function(e){
    var b3=e.target.closest('[data-tp]'); if(!b3) return;
    var tp=b3.getAttribute('data-tp');
    state.tp=(state.tp===tp?'':tp);
    band.querySelectorAll('.tprow').forEach(function(x){
      x.setAttribute('aria-pressed',x.getAttribute('data-tp')===state.tp);});
    render();
    document.getElementById('register').scrollIntoView({behavior:'smooth'});
  });
})();

/* contested list: collapsed preview, expand on demand */
(function(){
  var el=document.getElementById('contList');
  var btn=document.getElementById('contMore');
  var PREVIEW=6;
  function paint(n){
    el.innerHTML=CONTESTED.slice(0,n).map(function(r,i){return rowHTML(r,i,'c');}).join('');
    btn.style.display=n>=CONTESTED.length?'none':'';
  }
  paint(PREVIEW);
  btn.addEventListener('click',function(){paint(CONTESTED.length);});
  function tog(row){
    var open=row.classList.toggle('open');
    row.setAttribute('aria-expanded',open);
    if(open) row.querySelector('.rext').innerHTML=extHTML(CONTESTED[+row.getAttribute('data-i')]);
  }
  el.addEventListener('click',function(e){
    var row=e.target.closest('.rrow'); if(!row||e.target.closest('a')) return; tog(row);
  });
  el.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' ') return;
    var row=e.target.closest('.rrow'); if(!row) return; e.preventDefault(); tog(row);
  });
})();
document.getElementById('list').addEventListener('click',function(e){
  var row=e.target.closest('.rrow'); if(!row||e.target.closest('a')) return;
  toggleRow(row);
});
document.getElementById('list').addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ') return;
  var row=e.target.closest('.rrow'); if(!row) return;
  e.preventDefault(); toggleRow(row);
});
function toggleRow(row){
  var open=row.classList.toggle('open');
  row.setAttribute('aria-expanded',open);
  if(open){
    var r=window.__pool[+row.getAttribute('data-i')];
    row.querySelector('.rext').innerHTML=extHTML(r);
  }
}
render();

/* hero count-up */
(function(){
  var el=document.getElementById('bigN'), N=+el.getAttribute('data-n');
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=N.toLocaleString('en-US');return;}
  var t0=null;
  function step(ts){
    if(!t0)t0=ts;
    var k=Math.min(1,(ts-t0)/900), e=1-Math.pow(1-k,3);
    el.textContent=Math.round(N*e).toLocaleString('en-US');
    if(k<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

/* theme */
document.getElementById('themeBtn').addEventListener('click',function(){
  var cur=document.documentElement.getAttribute('data-theme');
  var next=cur==='dark'?'light':(cur==='light'?'dark':
    (matchMedia('(prefers-color-scheme:dark)').matches?'light':'dark'));
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('pl-theme',next);}catch(e){}
});
</script>
</body></html>"""

import datetime
subs = {
    "__Y0__": str(S["years"][0]),
    "__Y1__": str(S["years"][1]),
    "__TOTALN__": str(S["total"]),
    "__TOTAL__": "{:,}".format(S["total"]),
    "__NCONT__": str(sum(1 for r in RECS if r.get("vote", {}).get("noes", 0) > 0)),
    "__MEET__": str(S["meetings"]),
    "__RVPCT__": str(round(100 * S["readable_voted"] / max(1, S["readable"]))),
    "__RVN__": "{:,}".format(S["readable_voted"]),
    "__RDN__": "{:,}".format(S["readable"]),
    "__WBNOTE__": (" %d documents the county&rsquo;s site no longer serves were recovered from"
                   " the <a href=\"https://web.archive.org\">Internet Archive</a>&rsquo;s crawl of"
                   " niagaracounty.gov; their source links point to the archived copies."
                   % S["wayback_docs"]) if S.get("wayback_docs") else "",
    "__SCANROWS__": str(S["scan_rows"]),
    "__NONEROWS__": str(S["none_rows"]),
    "__FUTROWS__": str(sum(1 for r in RECS if r["date"] > __import__("datetime").date.today().isoformat())),
    "__UNAN__": str(unan_pct),
    "__UNANN__": "{:,}".format(n_unan),
    "__VOTED__": "{:,}".format(n_vote),
    "__CAPTOT__": ("$%.1fM" % (cap_total / 1e6)) if cap_total < 995e6 else ("$%.2fB" % (cap_total / 1e9)),
    "__SYMN__": "{:,}".format(next(t[2] for t in S["topics"] if t[0] == "s")),
    "__SYMPCT__": str(round(100 * next(t[2] for t in S["topics"] if t[0] == "s") / max(1, S["total"]))),
    "__DISSENT__": dissent_html,
    "__TOPCAPS__": topcap_html,
    "__PERYEAR__": "".join(per_year_rows),
    "__PAYLOAD__": payload,
    "__GLOSSJS__": GLOSS_JS,
    "__BUILT__": datetime.date.today().isoformat(),
}
html = HTML
for k, v in subs.items():
    assert k in html, "marker missing: " + k
    html = html.replace(k, v)

out = ROOT / "decisions.html"
out.write_text(html, encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size//1024} KB) - {S['total']} resolutions, "
      f"{S['meetings']} meetings, {S['years'][0]}-{S['years'][1]}")
