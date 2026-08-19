"""Render decisions.html - the Niagara County Legislature resolutions register.

Reads data/resolutions.json (built by build_resolutions.py). Standalone page in
the product's own physical-document language: the folio sheet on a desk, laid
paper grain, an engraved chamber letterhead, Fraunces display, a count-up hero
paired with a closing tally, a searchable drillable register (search reaches
legislator names and takes ?q= deep links), and the ink method band with the
honesty notes. Run manually after build_resolutions.py.
"""
import datetime
import io
import json
import re
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
# hero money count uses the SAME predicate as the register's $ chip
money_rows = sum(1 for r in RECS if "cap" in r or r.get("am"))

_MONN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
def _mon(dt):
    return f"{_MONN[int(dt[5:7])-1]} {dt[:4]}"

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
        f"<tr><td class='num c-y'>{y}</td><td class='num c-mt'>{len(by_year_meet[y])}</td>"
        f"<td class='num c-rs'>{len(rs)}</td><td class='num c-tx'>{100*tx//len(rs)}%</td>"
        f"<td class='num c-vm'>{100*v//len(rs)}%</td>"
        f"<td class='num c-am'>{100*a//len(rs)}%</td></tr>")

# ---- the money: what the votes put dollars behind --------------------------
# ceilings are deliberately NEVER summed into one headline number: change
# orders restate a whole contract's total as work changes, refunding bonds
# reissue old debt, and the biggest figures are IDA conduit issues the county
# approves but never spends. The page shows the permissions themselves.
_esc = lambda s: s.replace("&", "&amp;").replace("<", "&lt;")
_CMVAR = {"AD": "--cAD", "IF": "--cIF", "CSS": "--cCSS", "CS": "--cCS", "ED": "--cED"}
_TODAY = datetime.date.today().isoformat()

_caps = [r for r in RECS if "cap" in r]
CEIL_N = len(_caps)

def _mm(v):
    return "$%dM" % round(v / 1e6) if v >= 950_000 else "$%dK" % round(v / 1e3)

_IDA_RE = re.compile(r"Approving the Issuance|Revenue Bonds", re.I)
_REFUND_RE = re.compile(r"refunding", re.I)
_CO_RE = re.compile(r"change order|amendment|supplemental agreement", re.I)
_ida = [r for r in _caps if _IDA_RE.search(r["title"])]
IDA_N, IDA_SUM = len(_ida), sum(r["cap"] for r in _ida)
CO_N = sum(1 for r in _caps if _CO_RE.search(r["title"]))
_county_side = [r for r in _caps
                if not _IDA_RE.search(r["title"]) and not _REFUND_RE.search(r["title"])]
BIG_CTY = max(_county_side, key=lambda r: r["cap"])

# the ten largest permissions on record; long 147(f) bond captions get a
# readable label built from their own project parenthetical
_BOND_PRE = re.compile(r"^(?:Resolution|RESOLUTION) of the .{0,60}Legislature", re.I)

def _cap_label(r):
    t = r["title"]
    if _BOND_PRE.match(t):
        ps = [m for m in re.finditer(r"\(\s*([^()]{4,90}?)\s*\)", t)
              if '"' not in m.group(1) and "Code" not in m.group(1)
              and not re.match(r"[IVXivx]+$|the\b", m.group(1))]
        if ps:
            sm = re.search(r"Series\s+(\d{4})", t[ps[-1].end():ps[-1].end() + 26], re.I)
            kind = "Refunding bonds" if re.search(r"refunding", t, re.I) else "Revenue bonds"
            return (kind + " &mdash; " + _esc(ps[-1].group(1))
                    + (", Series " + sm.group(1) if sm else ""))
    return _esc(t[:150]) + ("&hellip;" if len(t) > 150 else "")

_top = sorted(_caps, key=lambda r: -r["cap"])[:10]
_capmax = _top[0]["cap"]

def _cap_class(r):
    if _IDA_RE.search(r["title"]):
        return " &middot; IDA pass-through, not county spending"
    if _REFUND_RE.search(r["title"]):
        return " &middot; reissues existing debt"
    if _CO_RE.search(r["title"]):
        return " &middot; restated contract total"
    return ""

top_caps_html = "".join(
    f"<button class='tcap' type='button' data-rid='{r['id']}' "
    f"style='--cmcol:var({_CMVAR.get(r['cm'], '--cX')})'>"
    f"<span class='tc-rank num'>{i+1:02d}</span>"
    f"<span class='tc-main'><span class='tc-t'>{_cap_label(r)}</span>"
    f"<span class='tc-meta'><b class='num'>{r['id']}</b> &middot; {_mon(r['date'])}{_cap_class(r)}</span>"
    f"<span class='tc-bar'><i style='width:{100*r['cap']/_capmax:.1f}%'></i></span></span>"
    f"<span class='tc-v num'>{money0(r['cap'])}</span></button>"
    for i, r in enumerate(_top))

# ---- the latest meeting, at a glance ---------------------------------------
_lm = max((r["date"] for r in RECS if r["date"] <= _TODAY), default=RECS[-1]["date"])
_lms = [r for r in RECS if r["date"] == _lm]
_lm_cont = sum(1 for r in _lms if r.get("vote", {}).get("noes", 0) > 0)
_lm_big = max((r for r in _lms if "cap" in r), key=lambda r: r["cap"], default=None)
_MONFULL = ["January", "February", "March", "April", "May", "June", "July",
            "August", "September", "October", "November", "December"]

def _fmtd(d):
    return f"{_MONFULL[int(d[5:7])-1]} {int(d[8:])}, {d[:4]}"

# no meeting-level ceiling sum here for the same reason there is no era
# total: a meeting's change orders restate contract totals
_lm_bits = [f"<b>{len(_lms)}</b> resolutions"]
_lm_bits.append(f"<b>{_lm_cont}</b> contested" if _lm_cont
                else "no vote drew a no")
latest_html = (
    f"<span class='fresh-k'>The latest meeting</span>"
    f"<span class='fresh-t'><b>{_fmtd(_lm)}</b> &middot; " + " &middot; ".join(_lm_bits) +
    ((" &middot; biggest: " + _esc(_lm_big["title"][:72]) +
      (f" &mdash; up to <b class='num'>{money0(_lm_big['cap'])}</b>")) if _lm_big else "") +
    "</span><a class='fresh-a' href='#register'>Open the meeting &rarr;</a>")

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

/* ---------- the record room's palette: warm paper, bronze accent ---------- */
:root{
  --paper:#f7f3ea; --card:#fdfaf2; --ink:#1e1c18; --muted:#5b564c; --faint:#8a8478;
  --rule:#e2dbc9; --rule-strong:#cbc2ad;
  --accent:#7a5c2e; --accent-soft:#f0e8d5;
  --ok:#3d6b40; --ok-soft:#e6efe3; --warn:#a04b2e; --warn-soft:#f6e6dc;
  --gridline:#e9e2d1; --desk:#e7dfca;
  --shadow:0 1px 2px rgba(30,28,24,.05), 0 8px 24px -12px rgba(30,28,24,.2);
  --cAD:#39557e;--cIF:#8a5a24;--cCSS:#7e3b3b;--cCS:#3d6b46;--cED:#5d4a7e;--cX:#6b675e}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --paper:#161513; --card:#1d1b18; --ink:#e8e3d8; --muted:#a89f8f; --faint:#7a7264;
  --rule:#312e28; --rule-strong:#413d34;
  --accent:#c9a35e; --accent-soft:#2b2416;
  --ok:#7fb884; --ok-soft:#1b271c; --warn:#d98b64; --warn-soft:#2d1e16;
  --gridline:#26241f; --desk:#0c0b09;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
  --cAD:#7d9cc9;--cIF:#c99b5c;--cCSS:#c97d7d;--cCS:#7fb88a;--cED:#a48fc9;--cX:#9a948a}}
:root[data-theme="dark"]{
  --paper:#161513; --card:#1d1b18; --ink:#e8e3d8; --muted:#a89f8f; --faint:#7a7264;
  --rule:#312e28; --rule-strong:#413d34;
  --accent:#c9a35e; --accent-soft:#2b2416;
  --ok:#7fb884; --ok-soft:#1b271c; --warn:#d98b64; --warn-soft:#2d1e16;
  --gridline:#26241f; --desk:#0c0b09;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
  --cAD:#7d9cc9;--cIF:#c99b5c;--cCSS:#c97d7d;--cCS:#7fb88a;--cED:#a48fc9;--cX:#9a948a}

*{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;
  border-top:5px solid var(--accent);background:var(--desk)}
body{margin:0;background:var(--desk);color:var(--ink);
  font:15px/1.55 Georgia,'Times New Roman',serif}
.num{font-family:'SF Mono',SFMono-Regular,ui-monospace,Menlo,Consolas,monospace;
  font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.wrap{max-width:1020px;margin:0 auto;padding:0 20px}
a{color:inherit}
h1,h2,h3,.serif{font-family:'Fraunces',Georgia,serif;font-weight:600;letter-spacing:-.01em}

/* ---------- the desk and the sheet ----------
   Same object language as the city ledger: the register is a bounded document
   lying on a desk, not a website that happens to be beige. */
.folio{position:relative;max-width:1380px;margin:0 auto;min-height:100vh;background:var(--paper);
  box-shadow:0 0 0 1px var(--rule-strong),0 30px 80px -34px rgba(28,24,14,.5)}
/* the clerk's red margin rule, shown only when the desk is visible */
.folio::before{content:'';position:absolute;top:0;bottom:0;left:34px;width:3px;pointer-events:none;
  border-left:1px solid rgba(158,43,40,.16);border-right:1px solid rgba(158,43,40,.16);z-index:1}
@media (max-width:1440px){.folio::before{display:none}}
@media (max-width:700px){.folio{box-shadow:none}}
/* laid-paper grain: kills the flat screen tone without fighting the ink */
body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:80;opacity:.028;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E")}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) body::after{opacity:.05}}
:root[data-theme="dark"] body::after{opacity:.05}

/* ---------- masthead ---------- */
.masthead{border-bottom:1px solid var(--rule-strong);background:var(--card)}
.mast-in{display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap;padding:24px 0 16px}
.mark{font:600 29px/1 'Fraunces',Georgia,serif;letter-spacing:.01em;white-space:nowrap}
.mark span{color:var(--accent)}
.tag{color:var(--muted);font-size:13.5px;max-width:54ch;margin-bottom:2px;font-family:system-ui,sans-serif}
.stampacts{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.stamp{display:flex;flex-direction:column;align-items:flex-end;text-align:right;
  font:12px system-ui;color:var(--faint);line-height:1.6}
.stamp b{color:var(--muted);font-weight:600}
.stamp a{color:var(--muted)}
.stamp .dot{display:none}
.acts{display:flex;gap:8px;align-items:center}
.briefbtn{display:inline-flex;align-items:center;gap:7px;background:var(--accent);color:var(--paper);
  border-radius:8px;padding:6px 12px;font:600 11.5px system-ui;text-decoration:none;white-space:nowrap}
.briefbtn:hover{filter:brightness(1.12)}
.ghostbtn{display:inline-flex;align-items:center;border:1px solid var(--rule-strong);color:var(--muted);
  border-radius:8px;padding:5px 11px;font:600 11.5px system-ui;text-decoration:none;white-space:nowrap}
.ghostbtn:hover{color:var(--ink);border-color:var(--accent)}
.themebtn{border:1px solid var(--rule-strong);background:transparent;color:var(--muted);border-radius:8px;
  width:31px;height:31px;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.themebtn svg{width:15px;height:15px;display:block}
.themebtn:hover{color:var(--ink);border-color:var(--accent)}
@media (max-width:640px){
  .mast-in{padding:15px 0 12px;gap:7px}
  .mark{font-size:24px}
  .tag{font-size:12.5px;max-width:none}
  .stampacts{margin-left:0;flex-direction:column-reverse;align-items:flex-start;gap:9px}
  .stamp{flex-direction:row;flex-wrap:wrap;gap:0 6px;align-items:baseline;text-align:left;font-size:11.5px}
  .stamp .dot{display:inline;color:var(--rule-strong)}
}

/* the chamber, in engraver's ink - fifteen desks because the vote lines
   below total fifteen; scales by centering, never by cropping */
.scene{background:var(--card);border-bottom:1px solid var(--rule-strong);overflow:hidden}
.scene svg{display:block;margin:0 auto;height:84px;width:auto;max-width:100%;color:var(--ink);opacity:.42}
@media (max-width:640px){.scene svg{height:60px}}

/* ---------- section rail ---------- */
.rail{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--paper) 88%,transparent);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--rule)}
.rail-in{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none}
.rail-in::-webkit-scrollbar{display:none}
.rail a{padding:12px 14px;font:13px system-ui;color:var(--muted);text-decoration:none;white-space:nowrap;
  border-bottom:2px solid transparent}
.rail a:hover{color:var(--ink)}
.rail a.on{color:var(--ink);border-bottom-color:var(--accent);font-weight:600}
section{scroll-margin-top:56px}

/* ---------- hero: the count paired with the closing tally ---------- */
.hero{padding:36px 0 14px}
.hero-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:26px;align-items:center}
@media (min-width:980px){.hero-grid{grid-template-columns:minmax(0,1fr) 380px;column-gap:56px}}
@media (min-width:1520px){.hero-grid{grid-template-columns:minmax(0,1fr) 420px;column-gap:90px}}
.eyebrow{font:600 11px/1 system-ui;letter-spacing:.16em;color:var(--faint);text-transform:uppercase}
.big{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:clamp(40px,7.4vw,74px);
  line-height:1.02;margin:10px 0 4px}
.big .num{font-family:'Fraunces',Georgia,serif;letter-spacing:0}
.lede{max-width:64ch;color:var(--muted);font-size:15.5px;margin:8px 0 0}
.hcard{background:var(--card);border:1px solid var(--rule-strong);border-radius:12px;
  padding:14px 17px 0;box-shadow:var(--shadow)}
.hrow{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:7px 0;
  width:100%;border:0;background:none;color:inherit;text-align:left}
.hrow .hk{font:600 10.5px/1.5 system-ui;letter-spacing:.09em;color:var(--faint);text-transform:uppercase}
.hrow .hv{font:600 22px/1.1 'Fraunces',Georgia,serif}
.hrow+.hrow{border-top:1px dotted var(--rule)}
.hrow.hlink{cursor:pointer;-webkit-tap-highlight-color:transparent}
.hrow.hlink .hv{display:inline-block;border-bottom:3px double var(--rule-strong);padding-bottom:4px;
  color:var(--accent)}
@media (hover:hover){.hrow.hlink:hover .hk{color:var(--accent)}}
.badge{display:flex;align-items:center;gap:8px;margin:8px -17px 0;text-decoration:none;
  background:var(--ok-soft);color:var(--ok);border-top:1px solid color-mix(in srgb,var(--ok) 30%,transparent);
  border-radius:0 0 11px 11px;padding:10px 16px;font:12.5px system-ui}
.badge b{font-weight:700;white-space:nowrap}
.badge .tick{font-weight:700}
.badge .arrow{margin-left:auto;opacity:.6;transition:transform .12s}
.badge:hover{background:color-mix(in srgb,var(--ok) 16%,transparent)}
.badge:hover .arrow{transform:translateX(3px)}

/* ---------- the latest meeting strip ---------- */
.fresh{background:var(--accent-soft);border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.fresh-in{display:flex;align-items:baseline;gap:4px 14px;flex-wrap:wrap;padding:9px 0;
  font:13px system-ui;color:var(--muted)}
.fresh-k{font:600 10.5px/1.7 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.14em;
  text-transform:uppercase;color:var(--accent);white-space:nowrap}
.fresh-t b{color:var(--ink);font-weight:600}
.fresh-a{color:var(--accent);text-decoration:none;font-weight:600;white-space:nowrap;margin-left:auto}
.fresh-a:hover{text-decoration:underline}
@media (max-width:640px){.fresh-in{font-size:12.5px;padding:8px 0}.fresh-a{margin-left:0}}

/* ---------- the money ---------- */
.moneysec{padding:34px 0 8px}
.moneysec h2{font-size:clamp(24px,3.4vw,32px);margin:0 0 6px}
.mtiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:14px}
.mtile{background:var(--card);border:1px solid var(--rule);border-radius:10px;
  padding:12px 14px;box-shadow:var(--shadow)}
.mtile .mtv{font-size:21px;font-weight:600;font-family:'Fraunces',Georgia,serif}
.mtile .mtl{font:600 9.5px/1.5 system-ui;letter-spacing:.07em;color:var(--faint);
  text-transform:uppercase;margin-top:3px}
.mpanel{background:var(--card);border:1px solid var(--rule);border-radius:12px;
  padding:16px 18px 12px;box-shadow:var(--shadow)}
.mpanel h3{margin:0 0 2px;font:600 15px/1.3 system-ui}
.mpanel .psub{color:var(--muted);font:12.5px system-ui;margin:0 0 10px}
.tc2{display:grid}
@media (min-width:1100px){.tc2{grid-template-columns:1fr 1fr;column-gap:44px}
  .tc2 .tcap:nth-child(5){border-bottom:0}}
.tcap{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;border:0;
  background:none;color:inherit;font:inherit;padding:9px 2px;cursor:pointer;
  border-bottom:1px dotted var(--rule);-webkit-tap-highlight-color:transparent}
.tcap:last-child{border-bottom:0}
@media (hover:hover){.tcap:hover{background:var(--accent-soft)}.tcap:hover .tc-t{text-decoration:underline}}
.tcap:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.tc-rank{flex:none;font-size:11px;color:var(--faint);padding-top:3px}
.tc-main{flex:1;min-width:0}
.tc-t{display:block;font-size:13.5px;line-height:1.4}
.tc-meta{display:block;font:600 9.5px/1.9 system-ui;letter-spacing:.06em;text-transform:uppercase;
  color:var(--faint)}
.tc-meta b{color:var(--cmcol,var(--faint))}
.tc-bar{display:block;height:5px;background:var(--gridline);border-radius:2px;overflow:hidden;margin-top:3px}
.tc-bar i{display:block;height:100%;background:var(--cmcol,var(--accent));opacity:.7;border-radius:0 2px 2px 0}
.tc-v{flex:none;font-weight:600;font-size:13px;padding-top:2px}

/* ---------- section furniture ---------- */
.sched{font:600 10.5px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.14em;
  text-transform:uppercase;color:var(--faint);margin:0 0 8px;display:flex;align-items:center;gap:10px}
.sched::after{content:'';flex:1;height:1px;background:var(--rule);max-width:180px}
h2{font:600 22px/1.3 'Fraunces',Georgia,serif;margin:0 0 4px}
.slede{color:var(--muted);font-size:13.5px;margin:0 0 16px;max-width:76ch;font-family:system-ui,sans-serif}

/* ---------- the register ---------- */
.reg{padding:36px 0 10px}
.controls{position:sticky;top:44px;z-index:10;background:color-mix(in srgb,var(--paper) 92%,transparent);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  padding:10px 0 12px;border-bottom:1px solid var(--rule);margin-bottom:8px}
.searchrow{display:flex;gap:10px;align-items:center}
#q{flex:1;background:var(--card);border:1px solid var(--rule-strong);border-radius:8px;
  color:var(--ink);font:15px Georgia,serif;padding:10px 14px;min-width:0;box-shadow:var(--shadow)}
#q:focus{outline:2px solid var(--accent);outline-offset:-1px}
#qn{font:12px system-ui;color:var(--faint);white-space:nowrap}
.kbd{font:600 11px/1 ui-monospace,Menlo,Consolas,monospace;color:var(--faint);
  border:1px solid var(--rule-strong);border-bottom-width:2px;border-radius:5px;padding:3px 6px}
@media (max-width:640px){.kbd{display:none}}
.try{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:9px}
.try>span{font:600 10.5px/1 system-ui;letter-spacing:.08em;color:var(--faint);text-transform:uppercase}
.tryb{font:600 11px system-ui;padding:5px 10px;border-radius:12px;border:1px solid var(--rule-strong);
  background:none;color:var(--muted);cursor:pointer;white-space:nowrap}
.tryb:hover{color:var(--accent);border-color:var(--accent)}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
@media (max-width:640px){
  /* one thumb-scrollable row instead of five stacked rows of chrome */
  .chips{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
  .chips::-webkit-scrollbar{display:none}
  .chips .fch{white-space:nowrap;flex:0 0 auto}
}
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
.years::-webkit-scrollbar{height:5px}
.years::-webkit-scrollbar-thumb{background:var(--rule-strong);border-radius:3px}
.yb{flex:0 0 auto;font:600 12px/1 ui-monospace,Menlo,Consolas,monospace;padding:7px 12px;
  border-radius:99px;border:1px solid var(--rule-strong);background:var(--card);color:var(--muted);
  cursor:pointer;white-space:nowrap;transition:background .12s,color .12s,border-color .12s}
.yb:hover{color:var(--ink);border-color:var(--accent)}
.yb[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff}
.controls.searching .years{opacity:.35}

.jumpNote{background:var(--card);border:1px solid var(--rule);border-radius:8px;
  padding:9px 13px;font:13px system-ui;color:var(--muted);margin:12px 0 2px}

/* year digest: the year at a glance, as stat tiles */
.digest{margin:14px 0 6px}
.digest .dgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.digest .dcell{background:var(--card);border:1px solid var(--rule);border-radius:10px;
  padding:11px 13px;box-shadow:var(--shadow)}
.digest .dcell .dv{font-size:20px;font-weight:600}
.digest .dcell .dl{font:600 9.5px/1.5 system-ui;letter-spacing:.08em;color:var(--faint);
  text-transform:uppercase;margin-top:2px}
.digest .dcm{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap}
.digest .dcmb{font:600 11px/1 system-ui;padding:5px 9px;border-radius:12px;cursor:pointer;
  border:1px solid var(--rule-strong);background:none;color:var(--muted)}
.digest .dcmb b{font-weight:700}
@media (max-width:640px){.digest .dgrid{grid-template-columns:repeat(3,1fr);gap:8px}
  .digest .dcell{padding:9px 11px}.digest .dcell .dv{font-size:17px}}

/* register rows: a carded sheet; each row carries its committee's color as a
   spine, the id in mono, the vote and money as quiet badges */
.regbox{background:var(--card);border:1px solid var(--rule);border-radius:12px;
  box-shadow:var(--shadow);overflow:hidden;margin-top:10px}
.mday{margin:0;display:flex;align-items:baseline;gap:10px;padding:12px 16px 8px;
  border-bottom:1px solid var(--rule);background:color-mix(in srgb,var(--paper) 55%,var(--card))}
.rrow+.mday,.mday+.mday{border-top:1px solid var(--rule-strong)}
.mday h3{margin:0;font-size:15px}
.mday .mn{font:11px system-ui;color:var(--faint)}
.rrow{border-bottom:1px solid var(--rule);padding:10px 16px 10px 13px;cursor:pointer;
  border-left:3px solid var(--cmcol,transparent);-webkit-tap-highlight-color:transparent}
.rrow:last-child{border-bottom:0}
@media (hover:hover){.rrow:hover{background:var(--accent-soft)}}
.rrow:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.rtop{display:flex;gap:10px;align-items:baseline}
.rid{font-size:11px;font-weight:600;color:var(--cmcol,var(--muted));white-space:nowrap}
.rtitle{flex:1;font-size:14px;min-width:0}
.rbadges{display:flex;gap:6px;align-items:baseline;white-space:nowrap}
.vb{font:600 11.5px system-ui;padding:2px 8px;border-radius:10px;
  background:var(--gridline);color:var(--muted)}
.vb.dis{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}
.vb.nov{background:none;border:1px dashed var(--rule-strong);color:var(--faint);font-weight:400}
.ab{font-size:11.5px;color:var(--accent);font-weight:600;white-space:nowrap}
.mwhy{font:600 9.5px/1.5 system-ui;letter-spacing:.04em;color:var(--accent);
  background:var(--accent-soft);border-radius:8px;padding:3px 7px;white-space:nowrap}
.rext{display:none;padding:10px 4px 6px;color:var(--muted);font-size:13px;border-left:2px solid var(--rule-strong);
  margin:8px 0 2px 4px;padding-left:12px}
.rrow.open{background:color-mix(in srgb,var(--accent-soft) 55%,transparent)}
.rrow.open .rext{display:block}
.rext .vline{margin:0 0 6px}
.rext .srcs{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}
.pill{display:inline-block;font:600 11px/1 system-ui;letter-spacing:.05em;padding:6px 10px;
  border:1px solid var(--rule-strong);border-radius:14px;color:var(--muted);text-decoration:none;
  background:var(--card)}
.pill:hover{border-color:var(--accent);color:var(--ink)}
.morex{margin:16px 0 30px;text-align:center}
.mut{color:var(--muted)}

/* the money drill inside a row */
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

/* ---------- contested votes ---------- */
.contested{padding:36px 0 6px}
.contested .csub{color:var(--muted);font-size:13.5px;margin:0 0 12px;max-width:70ch;
  font-family:system-ui,sans-serif}
.split{display:inline-block;width:64px;height:8px;border-radius:2px;overflow:hidden;
  background:var(--warn);vertical-align:middle}
.split i{display:block;height:100%;background:var(--ok);border-radius:0}

/* ---------- the method, set in ink ----------
   One dark band in a paper document: the verification section inverts to ink
   so the gates read as the vault. Children style themselves from scoped vars. */
.method{margin:40px 14px 14px;padding:30px 26px 30px;border-radius:14px;
  --paper:#22201c;--card:#2a2723;--ink:#e8e3d8;--muted:#a89f8f;--faint:#7a7264;
  --rule:#3a362e;--rule-strong:#4a453a;--accent:#c9a35e;--ok:#7fb884;
  --gridline:#33302a;--accent-soft:#332b1c;
  background:#22201c;color:var(--ink);scroll-margin-top:64px;
  box-shadow:0 18px 50px -22px rgba(15,12,8,.55)}
:root[data-theme="dark"] .method{background:#0f0e0d;--paper:#0f0e0d;--card:#181614;
  box-shadow:0 0 0 1px #221f1b}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .method{
  background:#0f0e0d;--paper:#0f0e0d;--card:#181614;box-shadow:0 0 0 1px #221f1b}}
.method .wrap{padding:0 6px}
.method h2{margin:0 0 10px}
.method p{color:var(--muted);max-width:76ch;font-size:13.5px}
.method a{color:var(--accent)}
.gate{font:600 12.5px/1.6 system-ui;background:color-mix(in srgb,var(--ok) 13%,transparent);
  color:var(--ok);border:1px solid color-mix(in srgb,var(--ok) 35%,transparent);
  border-radius:8px;padding:10px 13px;margin:14px 0;max-width:76ch;
  box-shadow:0 0 26px rgba(127,184,132,.14)}
.mtab{border-collapse:collapse;font-size:12.5px;margin:12px 0;font-family:system-ui,sans-serif}
.mtab th{font:600 10px/1.4 system-ui;letter-spacing:.08em;text-transform:uppercase;
  color:var(--faint);text-align:right;padding:4px 14px 4px 0}
.mtab td{text-align:right;padding:3px 14px 3px 0;color:var(--muted);border-top:1px solid var(--rule)}
.mtab th:first-child,.mtab td:first-child{text-align:left;color:var(--ink);font-weight:600}
.mgrid{display:grid;gap:0 56px}
@media (min-width:1100px){
  .mgrid{grid-template-columns:minmax(0,7fr) minmax(0,5fr);align-items:start}
  .mgrid .mtab{margin-top:6px;width:100%}
  .mgrid .mtab th:last-child,.mgrid .mtab td:last-child{padding-right:0}
  .mcols{column-count:2;column-gap:56px;margin-top:8px}
  .mcols p{break-inside:avoid;margin:0 0 14px}
}
@media (max-width:640px){.method{margin:32px 10px 10px;padding:22px 16px 22px;border-radius:12px}}

/* on a phone the six-column coverage table becomes one card per year -
   nothing scrolls sideways, nothing truncates */
@media (max-width:640px){
  .mtab,.mtab tbody{display:block;width:100%}
  .mtab thead{display:none}
  .mtab tr{display:grid;grid-template-columns:repeat(3,1fr);gap:2px 10px;
    padding:9px 2px;border-top:1px solid var(--rule)}
  .mtab td{display:block;padding:0;border:0;text-align:left;font-size:12.5px}
  .mtab td.c-y{grid-column:1/-1;font-size:14px;margin-bottom:2px}
  .mtab td::after{display:block;font:600 8.5px/1.4 system-ui;letter-spacing:.07em;
    text-transform:uppercase;color:var(--faint)}
  .mtab td.c-mt::after{content:'Meetings'}
  .mtab td.c-rs::after{content:'Resolutions'}
  .mtab td.c-tx::after{content:'Text located'}
  .mtab td.c-vm::after{content:'Votes matched'}
  .mtab td.c-am::after{content:'With amounts'}
}

/* ---------- footer ---------- */
.foot{padding:26px 0 44px;color:var(--faint);font:12.5px/1.7 system-ui}
.foot a{color:var(--muted)}
.foot p{max-width:86ch}

/* ---------- widths ---------- */
@media (min-width:1100px){
  .wrap{max-width:1150px}
  .contested .csub{max-width:none}
}
@media (min-width:1520px){
  .wrap{max-width:1300px}
}
@media (max-width:640px){
  .wrap{padding:0 14px}
  .hero{padding:20px 0 8px}
  .lede{font-size:13.5px}
  .rtop{flex-wrap:wrap}
  .rtitle{flex-basis:100%;order:3;margin-top:3px}
  .rbadges{margin-left:auto}
  .rrow{padding:10px 12px 10px 10px}
  .mday{padding:11px 12px 8px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
<script>
try{var t=localStorage.getItem('pl-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}
</script>
</head><body>
<div class="folio">

<header class="masthead"><div class="wrap mast-in">
  <div class="mast-main">
    <div class="mark"><a href="./" style="text-decoration:none">Public <span>Ledger</span></a></div>
    <div class="tag">The Decisions &mdash; every resolution the Niagara County Legislature has
      voted on, parsed from its own published agendas and minutes.</div>
  </div>
  <div class="stampacts">
    <div class="stamp">
      <span>Meetings through <b>__LASTMEET__</b></span><span class="dot">&middot;</span>
      <span><b>__TOTAL__</b> resolutions</span><span class="dot">&middot;</span>
      <span>source <a href="https://www.niagaracounty.gov/government/legislature/agendas_legislative_meetings/index.php">niagaracounty.gov</a></span>
    </div>
    <div class="acts">
      <a class="briefbtn" href="legislators.html">The legislators</a>
      <a class="ghostbtn" href="county.html">County ledger</a>
      <button class="themebtn" id="themeBtn" type="button" aria-label="Toggle light and dark theme"></button>
    </div>
  </div>
</div></header>

<div class="scene" aria-hidden="true"><svg viewBox="0 0 1200 110"
  fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
  <!-- back wall: entablature over the dais, arched windows down the chamber walls -->
  <path d="M452 10 H748" opacity=".5" stroke-width="1.1"/>
  <path d="M468 14 v24 M732 14 v24" opacity=".45" stroke-width="1.1"/>
  <path d="M140 40 v-20 q11 -9 22 0 v20 M151 21 v19 M225 40 v-20 q11 -9 22 0 v20 M236 21 v19"
    opacity=".5" stroke-width="1.1"/>
  <path d="M1038 40 v-20 q11 -9 22 0 v20 M1049 21 v19 M953 40 v-20 q11 -9 22 0 v20 M964 21 v19"
    opacity=".5" stroke-width="1.1"/>
  <!-- pendant lamps -->
  <path d="M352 0 v9 M848 0 v9" opacity=".45" stroke-width="1.1"/>
  <circle cx="352" cy="13" r="3.6" opacity=".5" stroke-width="1.2"/>
  <circle cx="848" cy="13" r="3.6" opacity=".5" stroke-width="1.2"/>
  <!-- county seal -->
  <circle cx="600" cy="19" r="8" opacity=".8"/>
  <circle cx="600" cy="19" r="4.4" opacity=".5" stroke-width="1.1"/>
  <!-- the dais: bench front, panel lines, three chairs behind -->
  <path d="M538 42 h124 v16 h-124 z"/>
  <path d="M562 42 v16 M586 42 v16 M614 42 v16 M638 42 v16" opacity=".4" stroke-width="1"/>
  <path d="M556 42 v-9 h13 v9 M593 42 v-12 h14 v12 M631 42 v-9 h13 v9" opacity=".8"/>
  <!-- flags flanking the bench -->
  <path d="M520 58 V 18 M680 58 V 18" opacity=".75"/>
  <path d="M520 19 l15 4 l-15 4 z M680 19 l-15 4 l15 4 z" opacity=".65"/>
  <!-- the clerk's table, front and center -->
  <path d="M572 68 h56 v10 h-56 z" opacity=".8"/>
  <path d="M575 78 v4 M625 78 v4" opacity=".6" stroke-width="1.2"/>
  <path d="M596 66 h8" opacity=".7" stroke-width="1.2"/>
  <!-- the tiered floor: two faint arcs the desks stand on -->
  <path d="M120 90 Q 600 122 1080 90" opacity=".3" stroke-width="1.1"/>
  <path d="M270 74 Q 600 100 930 74" opacity=".25" stroke-width="1.1"/>
  <!-- fifteen member desks in two arcs facing the dais: eight out, seven in;
       the arcs dip toward the viewer at the center aisle -->
  <g opacity=".75">
    <path d="M134 71 h32 v9 h-32 z M138 80 v5 M162 80 v5 M244 83 h32 v9 h-32 z M248 92 v5 M272 92 v5"/>
    <path d="M354 91 h32 v9 h-32 z M358 100 v5 M382 100 v5 M459 95 h32 v9 h-32 z M463 104 v5 M487 104 v5"/>
    <path d="M709 95 h32 v9 h-32 z M713 104 v5 M737 104 v5 M814 91 h32 v9 h-32 z M818 100 v5 M842 100 v5"/>
    <path d="M924 83 h32 v9 h-32 z M928 92 v5 M952 92 v5 M1034 71 h32 v9 h-32 z M1038 80 v5 M1062 80 v5"/>
  </g>
  <g opacity=".6">
    <path d="M289 56 h30 v8 h-30 z M293 64 v4 M315 64 v4 M379 64 h30 v8 h-30 z M383 72 v4 M405 72 v4"/>
    <path d="M469 70 h30 v8 h-30 z M473 78 v4 M495 78 v4"/>
    <path d="M585 84 h30 v8 h-30 z M589 92 v4 M611 92 v4"/>
    <path d="M701 70 h30 v8 h-30 z M705 78 v4 M727 78 v4"/>
    <path d="M791 64 h30 v8 h-30 z M795 72 v4 M817 72 v4 M881 56 h30 v8 h-30 z M885 64 v4 M907 64 v4"/>
  </g>
  <!-- the public gallery at the chamber's edges -->
  <path d="M26 78 h62 M20 86 h74 M26 94 h84" opacity=".5" stroke-width="1.2"/>
  <path d="M1112 78 h62 M1106 86 h74 M1090 94 h84" opacity=".5" stroke-width="1.2"/>
  <text x="1188" y="108" text-anchor="end" font-family="ui-monospace,Menlo,Consolas,monospace"
    font-size="9.5" letter-spacing=".14em" fill="currentColor" stroke="none"
    opacity=".8">THE CHAMBER &#183; FIFTEEN SEATS &#183; NIAGARA COUNTY</text>
</svg></div>

<nav class="rail"><div class="wrap rail-in">
  <a href="#money" class="on">The money</a>
  <a href="#register">The register</a>
  <a href="#contested">Contested votes</a>
  <a href="#method">How this was built</a>
  <a href="poster.html">The poster</a>
  <a href="contested.html">The game</a>
</div></nav>

<section class="hero"><div class="wrap hero-grid">
  <div class="hero-main">
    <div class="eyebrow">Niagara County Legislature &middot; __Y0__&ndash;__Y1__</div>
    <h1 class="big"><span class="num" id="bigN" data-n="__TOTALN__">0</span> decisions</h1>
    <p class="lede">The county can&rsquo;t spend a dollar, sign a contract, settle a claim, or move
    budget money without its Legislature voting on a numbered <b>resolution</b>. The
    <a href="county.html">county ledger</a> shows where the money went &mdash; this register is the
    record of who voted to send it. Every row links back to the county&rsquo;s own source document.</p>
  </div>
  <div class="hcard">
    <div class="hrow"><span class="hk">Meetings parsed</span><span class="hv num">__MEET__</span></div>
    <div class="hrow"><span class="hk">Votes matched &middot; readable minutes</span><span class="hv num">__RVPCT__%</span></div>
    <div class="hrow"><span class="hk">Passed unanimously</span><span class="hv num">__UNAN__%</span></div>
    <button class="hrow hlink" id="tallyMoney" type="button"><span class="hk">Mention dollar figures</span><span class="hv num">__MONEYN__</span></button>
    <a class="badge" href="#method"><span class="tick">&#10003;</span>
      <b>every id tied out</b> <span>against its meeting&rsquo;s own agenda</span>
      <span class="arrow">&rarr;</span></a>
  </div>
</div></section>

<div class="fresh"><div class="wrap fresh-in">__LATEST__</div></div>

<section class="moneysec" id="money"><div class="wrap">
  <div class="sched">The money &middot; what the votes put dollars behind</div>
  <h2>The largest permissions on record</h2>
  <p class="slede">__CEILN__ of the __TOTAL__ resolutions carry a &ldquo;not to exceed&rdquo;
  ceiling. They are deliberately never summed into one headline number: change orders restate a
  whole contract&rsquo;s total as the work changes, refunding bonds reissue existing debt, and
  the biggest figures are IDA bond issues the county approves but never spends. So this page
  shows the permissions themselves, biggest first, each labeled for what it is &mdash; and the
  <a href="county.html">county ledger</a> shows what was actually spent.</p>
  <div class="mtiles">
    <div class="mtile"><div class="mtv num">__CEILN__</div><div class="mtl">Resolutions with a spending ceiling</div></div>
    <div class="mtile"><div class="mtv num">__IDASUM__</div><div class="mtl">IDA bond sign-offs &middot; __IDAN__ issues, pass-through</div></div>
    <div class="mtile"><div class="mtv num">__CON__</div><div class="mtl">Change-order &amp; amendment ceilings</div></div>
    <div class="mtile"><div class="mtv num">__BIGCTY__</div><div class="mtl">__BIGCTYL__</div></div>
  </div>
  <div class="mpanel" style="margin-top:14px">
    <p class="psub" style="margin-bottom:4px">Select any permission to open its full record &mdash;
    the vote, the clauses, the source PDF.</p>
    <div id="topCaps" class="tc2">__TOPCAPS__</div>
  </div>
</div></section>

<section class="reg" id="register"><div class="wrap">
  <div class="sched">The register &middot; every resolution, __Y0__&ndash;__Y1__</div>
  <h2>Look up any vote</h2>
  <p class="slede">Search reaches titles, resolution ids, and legislators&rsquo; names &mdash;
  who moved a resolution, who seconded it, who voted no, who was absent. Open any row for the
  full record and the source PDF.</p>
  <div class="controls">
    <div class="searchrow">
      <input id="q" type="search" placeholder="Search __TOTAL__ resolutions &mdash; a topic, a road, a vendor, a legislator&hellip;" aria-label="Search resolutions">
      <span class="kbd" title="Press / to search">/</span>
      <span id="qn"></span>
    </div>
    <div class="try" id="tryRow"><span>Try</span></div>
    <div class="chips" id="cmChips"></div>
    <div class="xrow">
      <button class="fch" id="moneyChip" aria-pressed="false">$ Mentions dollars
        <span class="n num" id="moneyN"></span></button>
      <select class="msel" id="moverSel" aria-label="Filter by who moved it"></select>
      <select class="msel" id="tpSel" aria-label="Filter by what the decision is about"></select>
    </div>
    <div class="years" id="yearRow"></div>
  </div>
  <div class="digest" id="digest"></div>
  <div class="regbox"><div id="list"></div></div>
  <div class="morex"><button class="pill" id="moreBtn" style="cursor:pointer">Show more</button></div>
</div></section>

<section class="contested" id="contested"><div class="wrap">
  <div class="sched">The exceptions &middot; every no vote on record</div>
  <h2>Every contested vote</h2>
  <p class="csub">Twelve years and __TOTAL__ resolutions produced <b>__NCONT__</b> that drew a
  no vote. The newest are below &mdash; green is the ayes&rsquo; share.</p>
  <div class="regbox"><div id="contList"></div></div>
  <div class="morex"><button class="pill" id="contMore" style="cursor:pointer">Show all __NCONT__ contested votes</button></div>
</div></section>

<section class="method" id="method"><div class="wrap">
  <div class="sched">How this register is built</div>
  <div class="mgrid">
  <div>
  <h2>The record, verified against itself</h2>
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
  </div>
  <div>
  <table class="mtab"><thead><tr><th>Year</th><th>Meetings</th><th>Resolutions</th>
  <th>Text located</th><th>Votes matched</th><th>With amounts</th></tr></thead><tbody>__PERYEAR__</tbody></table>
  </div>
  </div>
  <div class="mcols">
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
  <p class="extras"><b>Two other ways in:</b> <a href="poster.html">The Quiet Chamber</a> &mdash;
  every one of the __TOTAL__ votes on a single poster &mdash; and
  <a href="contested.html">Contested</a>, a ten-round game: two real resolutions, one drew a
  fight, can you tell which?</p>
  </div>
</div></section>

<footer class="foot"><div class="wrap">
  <p>Companions: <a href="./">the City Ledger</a> &mdash; North Tonawanda&rsquo;s approved claims and
  30 years of filings &mdash; <a href="county.html">the County Edition</a>,
  <a href="legislators.html">the Legislators</a>, <a href="atlas.html">the County Atlas</a>, and
  <a href="school.html">the School District</a>.</p>
  <p>Built by Joe Curry from public records published by Niagara County. Not affiliated with,
  endorsed by, or produced for the County. Corrections welcome &mdash; every row links to its
  meeting&rsquo;s source PDF. Built __BUILT__.</p>
</div></footer>

</div><!-- /folio -->

<script id="R" type="application/json">__PAYLOAD__</script>
<script>
__GLOSSJS__
var R=JSON.parse(document.getElementById('R').textContent);
var CM=R.summary.committees, RECS=R.resolutions;
var CMCOLOR={AD:'--cAD',IF:'--cIF',CSS:'--cCSS',CS:'--cCS',ED:'--cED'};
var money0=function(v){return '$'+Math.round(v).toLocaleString('en-US');};
var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};

/* search reaches names: one lowercase haystack per record, built once */
RECS.forEach(function(r){
  var v=r.vote||{};
  r._s=(r.id+' '+r.title+' '+(r.cms||'')+' '+(v.mover||'')+' '+(v.second||'')+' '+
    (v.no_names||[]).join(' ')+' '+(v.abs_names||[]).join(' ')+' '+(r.sp||[]).join(' ')).toLowerCase();
});

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
  return '<span class="'+cls+' num">'+t+'</span>';
}
function amtBadge(r){
  if(r.cap) return '<span class="ab num">up to '+money0(r.cap)+'</span>';
  if(r.amt) return '<span class="ab num" style="opacity:.75">'+money0(r.amt)+' in text</span>';
  return '';
}
/* in search mode, say WHY a row matched when its title alone doesn't */
function matchWhy(r,q){
  if(!q||(r.id+' '+r.title).toLowerCase().indexOf(q)>=0) return '';
  var v=r.vote||{}, i;
  function has(n){return n&&n.toLowerCase().indexOf(q)>=0;}
  if(has(v.mover)) return 'moved by '+v.mover;
  if(has(v.second)) return 'seconded by '+v.second;
  for(i=0;i<(v.no_names||[]).length;i++) if(has(v.no_names[i])) return 'voted no: '+v.no_names[i];
  for(i=0;i<(v.abs_names||[]).length;i++) if(has(v.abs_names[i])) return 'absent: '+v.abs_names[i];
  for(i=0;i<(r.sp||[]).length;i++) if(has(r.sp[i])) return 'sponsor: '+r.sp[i];
  if((r.cms||'').toLowerCase().indexOf(q)>=0) return 'committee';
  return '';
}
function rowHTML(r,i,pool){
  var split='';
  if(pool==='c'){
    var v=r.vote, pc=100*v.ayes/(v.ayes+v.noes);
    split='<span class="split" title="'+v.ayes+' ayes, '+v.noes+' noes"><i style="width:'+pc.toFixed(0)+'%"></i></span> ';
  }
  var why=pool?'':matchWhy(r,state.q.length>=2?state.q.toLowerCase():'');
  return '<div class="rrow" data-i="'+i+'"'+(pool?' data-pool="'+pool+'"':'')+
    ' style="--cmcol:'+cmColor(r.cm)+'" tabindex="0" role="button" aria-expanded="false">'+
    '<div class="rtop">'+
      '<span class="rid num">'+r.id+'</span>'+
      '<span class="rtitle">'+esc(r.title)+'</span>'+
      '<span class="rbadges">'+(why?'<span class="mwhy">'+esc(why)+'</span>':'')+
        split+amtBadge(r)+voteBadge(r)+'</span>'+
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
    var KL={cap:'CEILING',inc:'BUDGET +',dec:'BUDGET −',awd:'AWARD',bid:'BID',
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
          (g?' &middot; <span class="acg">'+esc(g.split(' - ')[0].split(' — ')[0])+'</span>':'')+'</a>';
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
    p=RECS.filter(function(r){return r._s.indexOf(q)>=0;});
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
  var pre='';
  if(jump&&jump.to){
    pre='<p class="jumpNote" style="margin:10px 14px">No matches in '+jump.from+' &mdash; jumped to <b>'+jump.to+
      '</b>, the newest year with results.</p>';
  }
  if(!h){
    var hasF=state.cm||state.tp||state.money||state.mover;
    h=hasF
      ?'<div style="padding:22px 16px 26px"><p class="mut">Nothing matches this combination of filters '+
        'in any year.</p><button class="pill" id="clearAll" style="cursor:pointer">'+
        'Clear filters</button></div>'
      :'<p class="mut" style="padding:22px 16px 26px">Nothing matches.</p>';
  }
  document.getElementById('list').innerHTML=pre+h;
  var ca=document.getElementById('clearAll');
  if(ca) ca.addEventListener('click',function(){
    state.cm='';state.tp='';state.money=false;state.mover='';
    document.querySelectorAll('#cmChips .fch').forEach(function(x){
      x.setAttribute('aria-pressed',x.getAttribute('data-cm')==='');});
    var mc=document.getElementById('moneyChip'); mc.setAttribute('aria-pressed','false');
    var ms=document.getElementById('moverSel'); ms.value=''; ms.classList.remove('on');
    var ts=document.getElementById('tpSel'); ts.value=''; ts.classList.remove('on');
    render();
  });
  document.getElementById('qn').textContent=state.q.length>=2?(p.length+' match'+(p.length===1?'':'es')):'';
  document.querySelector('.controls').classList.toggle('searching',state.q.length>=2);
  document.getElementById('moreBtn').style.display=upTo<p.length?'':'none';
  document.getElementById('moreBtn').textContent='Show '+Math.min(PAGE,p.length-upTo)+' more of '+p.length;
  window.__pool=p;
  /* a search that lands on exactly one row opens its record */
  if(state.q.length>=2&&p.length===1){
    var one=document.querySelector('#list .rrow');
    if(one&&!one.classList.contains('open')) toggleRow(one);
  }
  var ts2=document.getElementById('tpSel');
  if(ts2){ts2.value=state.tp;ts2.classList.toggle('on',!!state.tp);}
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
function syncURL(){
  try{
    var u=new URL(location.href);
    if(state.q.length>=2) u.searchParams.set('q',state.q);
    else u.searchParams.delete('q');
    history.replaceState(null,'',u);
  }catch(e){}
}
qEl.addEventListener('input',function(){
  clearTimeout(qt); qt=setTimeout(function(){state.q=qEl.value.trim();render();syncURL();},140);
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
(function(){
  var ts=document.getElementById('tpSel');
  var items=(R.summary.topics||[]).slice().sort(function(a,b){return b[2]-a[2];});
  ts.innerHTML='<option value="">About: anything</option>'+items.map(function(t){
    return '<option value="'+t[0]+'">'+esc(t[1])+' ('+t[2].toLocaleString('en-US')+')</option>';}).join('');
  ts.addEventListener('change',function(){
    state.tp=ts.value;
    ts.classList.toggle('on',!!state.tp);
    render();
  });
})();
document.getElementById('digest').addEventListener('click',function(e){
  var b2=e.target.closest('[data-dcm]'); if(!b2) return;
  var c=b2.getAttribute('data-dcm');
  var chip=document.querySelector('#cmChips [data-cm="'+c+'"]')||document.querySelector('#cmChips [data-cm=""]');
  chip.click();
});

/* try-chips: worked examples, one of each kind of search */
(function(){
  var tr=document.getElementById('tryRow');
  var seeds=['casino funding','landfill','sheriff','mortgage tax'];
  /* one legislator name, picked live so it always exists in the data */
  var movers={};
  RECS.forEach(function(r){if(r.vote&&r.vote.mover) movers[r.vote.mover]=(movers[r.vote.mover]||0)+1;});
  var top=Object.keys(movers).sort(function(a,b){return movers[b]-movers[a];})[0];
  if(top) seeds.splice(2,0,top);
  tr.insertAdjacentHTML('beforeend',seeds.map(function(s){
    return '<button class="tryb" type="button" data-q="'+esc(s)+'">'+esc(s)+'</button>';}).join(''));
  tr.addEventListener('click',function(e){
    var b=e.target.closest('[data-q]'); if(!b) return;
    qEl.value=b.getAttribute('data-q');
    state.q=qEl.value; render(); syncURL();
    qEl.focus();
  });
})();

/* the largest-permissions list opens that record in the register */
(function(){
  var el=document.getElementById('topCaps'); if(!el) return;
  el.addEventListener('click',function(e){
    var b=e.target.closest('[data-rid]'); if(!b) return;
    qEl.value=b.getAttribute('data-rid');
    state.q=qEl.value; render(); syncURL();
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
/* hero money tally -> $ filter + register */
(function(){
  var t=document.getElementById('tallyMoney'); if(!t) return;
  t.addEventListener('click',function(){
    var mc=document.getElementById('moneyChip');
    if(mc.getAttribute('aria-pressed')!=='true') mc.click();
    document.getElementById('register').scrollIntoView({behavior:'smooth'});
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

/* deep links: ?q=Bradt (or #q=) opens the register pre-searched - campaign
   and record pages can point straight at a lookup */
(function(){
  var q0='';
  try{q0=new URLSearchParams(location.search).get('q')||'';}catch(e){}
  if(!q0&&location.hash.indexOf('q=')===1) q0=decodeURIComponent(location.hash.slice(3));
  if(q0){
    qEl.value=q0; state.q=q0.trim();
    setTimeout(function(){
      document.getElementById('register').scrollIntoView();
    },60);
  }
})();
render();

/* press / anywhere to search */
document.addEventListener('keydown',function(e){
  if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey) return;
  var t=(e.target.tagName||'');
  if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT') return;
  e.preventDefault(); qEl.focus(); qEl.select();
});

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

/* rail scrollspy */
(function(){
  var links=[].slice.call(document.querySelectorAll('.rail a[href^="#"]'));
  var secs=links.map(function(a){return document.getElementById(a.getAttribute('href').slice(1));});
  var tick=false;
  function paint(){
    tick=false;
    var y=window.scrollY+130, on=0;
    for(var i=0;i<secs.length;i++){ if(secs[i]&&secs[i].offsetTop<=y) on=i; }
    links.forEach(function(a,i){a.classList.toggle('on',i===on);});
  }
  window.addEventListener('scroll',function(){
    if(!tick){tick=true;requestAnimationFrame(paint);}
  },{passive:true});
  paint();
})();

/* theme */
var themeBtn=document.getElementById('themeBtn');
function themeNow(){
  var cur=document.documentElement.getAttribute('data-theme');
  if(!cur){cur=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}
  return cur;
}
function themeIcon(){
  themeBtn.innerHTML = themeNow()==='dark'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9L5 19"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.2A8.3 8.3 0 0 1 9.8 3.6a8.3 8.3 0 1 0 10.6 10.6z"/></svg>';
}
themeBtn.addEventListener('click',function(){
  var next=themeNow()==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('pl-theme',next);}catch(e){}
  themeIcon();
});
themeIcon();
</script>
</body></html>"""

_last_held = max((r["date"] for r in RECS if r["date"] <= datetime.date.today().isoformat()),
                 default=max(r["date"] for r in RECS))
subs = {
    "__LATEST__": latest_html,
    "__CEILN__": f"{CEIL_N:,}",
    "__TOPCAPS__": top_caps_html,
    "__IDASUM__": _mm(IDA_SUM),
    "__IDAN__": str(IDA_N),
    "__CON__": str(CO_N),
    "__BIGCTY__": money0(BIG_CTY["cap"]),
    # the phrase is hand-verified against the raw text for the id it names;
    # if the data ever crowns a new leader the label falls back to its id
    "__BIGCTYL__": "Biggest county-side ceiling &middot; " + {
        "CW-018-18": "2018 energy-performance equipment lease",
    }.get(BIG_CTY["id"], BIG_CTY["id"] + ", " + BIG_CTY["date"][:4]),
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
    "__FUTROWS__": str(sum(1 for r in RECS if r["date"] > datetime.date.today().isoformat())),
    "__UNAN__": str(unan_pct),
    "__MONEYN__": f"{money_rows:,}",
    "__PERYEAR__": "".join(per_year_rows),
    "__PAYLOAD__": payload,
    "__GLOSSJS__": GLOSS_JS,
    "__BUILT__": datetime.date.today().isoformat(),
    "__LASTMEET__": "{} {}, {}".format(
        ["January","February","March","April","May","June","July","August",
         "September","October","November","December"][int(_last_held[5:7]) - 1],
        int(_last_held[8:]), _last_held[:4]),
}
html = HTML
for k, v in subs.items():
    assert k in html, "marker missing: " + k
    html = html.replace(k, v)

out = ROOT / "decisions.html"
out.write_text(html, encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size//1024} KB) - {S['total']} resolutions, "
      f"{S['meetings']} meetings, {S['years'][0]}-{S['years'][1]}")
