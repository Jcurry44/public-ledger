"""Render legislators.html - per-member records from the parsed minutes.

Everything here is derived from data/resolutions.json: who moved and seconded,
who cast each no vote, who was recorded absent, and (for Individual-legislator
resolutions) who sponsored. Attendance is computed against machine-readable
meetings only, inside each member's own active span. Run after
build_resolutions.py.
"""
import io
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "data" / "resolutions.json").read_text(encoding="utf-8"))
RECS = DATA["resolutions"]
MSTAT = DATA.get("mstat", {})

# ---- aggregate -------------------------------------------------------------
legs = defaultdict(lambda: {"mv": 0, "sec": 0, "no": [], "abs": set(),
                            "sp": [], "years": set()})
roster = set()
for r in RECS:
    v = r.get("vote")
    if not v:
        continue
    y = int(r["date"][:4])
    if "mover" in v:
        roster.add(v["mover"])
        legs[v["mover"]]["mv"] += 1
        legs[v["mover"]]["years"].add(y)
    if "second" in v:
        roster.add(v["second"])
        legs[v["second"]]["sec"] += 1
        legs[v["second"]]["years"].add(y)
    for n in v.get("no_names", []):
        roster.add(n)
        legs[n]["no"].append(r)
        legs[n]["years"].add(y)
    for n in v.get("abs_names", []):
        roster.add(n)
        legs[n]["abs"].add(r["date"])
        legs[n]["years"].add(y)

for r in RECS:
    for n in r.get("sp", []):
        if n in roster:     # committee prose ("Economic Development") never votes
            legs[n]["sp"].append(r)
            legs[n]["years"].add(int(r["date"][:4]))

# readable meetings per year (a date counts if any vote was parsed there)
readable_dates = sorted({r["date"] for r in RECS if "vote" in r})
latest_year = max(int(d[:4]) for d in readable_dates)

profiles = []
for name, L in legs.items():
    if not L["years"]:
        continue
    y0, y1 = min(L["years"]), max(L["years"])
    span = [d for d in readable_dates if y0 <= int(d[:4]) <= y1]
    missed = sorted(dd for dd in L["abs"] if dd in set(span))
    att = 100.0 * (1 - len(missed) / max(1, len(span)))
    profiles.append({
        "name": name, "y0": y0, "y1": y1, "cur": y1 >= latest_year,
        "mv": L["mv"], "sec": L["sec"],
        "no": sorted(L["no"], key=lambda r: r["date"], reverse=True),
        "sp": sorted(L["sp"], key=lambda r: r["date"], reverse=True),
        "meet": len(span), "missed": len(missed), "att": att,
    })
profiles.sort(key=lambda p: (-p["cur"], -(p["mv"] + p["sec"] + len(p["no"]) + len(p["sp"]))))

n_cur = sum(1 for p in profiles if p["cur"])
print(f"{len(profiles)} legislators ({n_cur} current)")


def money_esc(t):
    return (t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def rowlist(rows, empty, cap=12):
    if not rows:
        return f'<p class="pmut">{empty}</p>'
    h = ""
    for r in rows[:cap]:
        v = r.get("vote", {})
        vt = ""
        if v and v.get("noes", 0) > 0:
            vt = f'<span class="pv">{v["ayes"]}&ndash;{v["noes"]}</span>'
        h += (f'<div class="prow"><span class="pid num">{r["id"]}</span>'
              f'<span class="pd num">{r["date"][:4]}</span>'
              f'<span class="pt">{money_esc(r["title"][:110])}</span>{vt}</div>')
    if len(rows) > cap:
        h += f'<p class="pmut">+ {len(rows)-cap} more &mdash; searchable in the register.</p>'
    return h


cards = []
for p in profiles:
    att_cls = "ok" if p["att"] >= 90 else ("mid" if p["att"] >= 80 else "low")
    dis = rowlist(p["no"], "No recorded no votes &mdash; never dissented in the parsed record.")
    spon = rowlist(p["sp"], "No individual-legislator resolutions under this name in the parsed record.")
    cards.append(f'''
<div class="lcard{'' if p['cur'] else ' past'}" tabindex="0" role="button" aria-expanded="false">
  <div class="ltop">
    <span class="lname">{money_esc(p["name"])}</span>
    <span class="lyrs num">{p["y0"]}&ndash;{p["y1"]}</span>
    {'<span class="lcur">serving</span>' if p['cur'] else ''}
  </div>
  <div class="lstats">
    <span class="ls"><b class="num">{p["mv"]:,}</b> moved</span>
    <span class="ls"><b class="num">{p["sec"]:,}</b> seconded</span>
    <span class="ls"><b class="num">{len(p["no"])}</b> no votes</span>
    <span class="ls"><b class="num">{len(p["sp"])}</b> sponsored</span>
    <span class="ls att-{att_cls}"><b class="num">{p["att"]:.0f}%</b> attendance
      <i class="abar"><u style="width:{p["att"]:.0f}%"></u></i></span>
  </div>
  <div class="lext">
    <div class="psub">Attendance: recorded absent at <b class="num">{p["missed"]}</b> of
      <b class="num">{p["meet"]}</b> machine-readable meetings during {p["y0"]}&ndash;{p["y1"]}.</div>
    <div class="ph">Their no votes</div>{dis}
    <div class="ph">Resolutions they sponsored</div>{spon}
  </div>
</div>''')

split = next((i for i, p in enumerate(profiles) if not p["cur"]), len(profiles))
current_cards = "".join(cards[:split])
former_cards = "".join(cards[split:])

HTML = r"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>The Legislators - Niagara County, __Y0__-__Y1__ | Public Ledger</title>
<meta name="description" content="Every Niagara County legislator's record from the minutes: moves, seconds, no votes, sponsorships and attendance, __Y0__-__Y1__.">
<meta property="og:title" content="The Legislators - Niagara County">
<meta property="og:description" content="Who moves, who dissents, who shows up - every member's record parsed from the county's own minutes, __Y0__-__Y1__.">
<meta property="og:image" content="https://jcurry44.github.io/public-ledger/og-legislators.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<style>
@font-face{font-family:'Fraunces';src:url('fonts/Fraunces-600-latin.woff2') format('woff2');
  font-weight:600;font-style:normal;font-display:swap}
:root{--paper:#f6f2ea;--ink:#1e1c18;--muted:#5b564c;--faint:#8a8478;--rule:#dcd5c6;
  --rule-strong:#c8c0ae;--card:#fbf8f2;--accent:#7a5c2e;--ok:#3d6b40;--warn:#a04b2e;
  --gridline:#e7e1d3}
:root[data-theme="dark"]{--paper:#161513;--ink:#e8e3d8;--muted:#a89f8f;--faint:#7a7264;
  --rule:#312e28;--rule-strong:#413d34;--card:#1d1b18;--accent:#c9a35e;--ok:#7fb884;
  --warn:#d98b64;--gridline:#26241f}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:#161513;--ink:#e8e3d8;
  --muted:#a89f8f;--faint:#7a7264;--rule:#312e28;--rule-strong:#413d34;--card:#1d1b18;
  --accent:#c9a35e;--ok:#7fb884;--warn:#d98b64;--gridline:#26241f}}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font:15px/1.55 Georgia,'Times New Roman',serif;-webkit-text-size-adjust:100%}
.num{font-family:'SF Mono',SFMono-Regular,ui-monospace,Menlo,Consolas,monospace;
  font-variant-numeric:tabular-nums}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}
a{color:inherit}
h1,h2,h3{font-family:'Fraunces',Georgia,serif;font-weight:600;letter-spacing:-.01em}
.mast{border-bottom:2px solid var(--ink);padding:14px 0 10px}
.mrow{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.wordmark{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:19px;text-decoration:none}
.chip{font:600 10px/1 system-ui;letter-spacing:.12em;padding:4px 8px;border:1px solid var(--rule-strong);
  border-radius:3px;color:var(--muted);white-space:nowrap}
.mnav{margin-left:auto;display:flex;gap:14px;font:12px system-ui;flex-wrap:wrap}
.mnav a{color:var(--muted);text-decoration:none;border-bottom:1px solid transparent}
.mnav a:hover{color:var(--ink);border-bottom-color:var(--accent)}
#themeBtn{background:none;border:1px solid var(--rule-strong);border-radius:3px;color:var(--muted);
  cursor:pointer;font-size:12px;padding:3px 7px}
.hero{padding:40px 0 22px}
.eyebrow{font:600 11px/1 system-ui;letter-spacing:.16em;color:var(--faint);text-transform:uppercase}
.big{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:clamp(34px,7vw,58px);
  line-height:1.05;margin:10px 0 6px}
.lede{max-width:66ch;color:var(--muted);font-size:15.5px}
h2.sect{font-size:24px;margin:30px 0 4px}
.sectsub{color:var(--faint);font:12px system-ui;margin:0 0 12px}
.lcard{border:1px solid var(--rule);border-radius:8px;background:var(--card);
  padding:14px 16px 12px;margin:10px 0;cursor:pointer}
.lcard:hover{border-color:var(--rule-strong)}
.lcard.past{opacity:.88}
.ltop{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.lname{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:20px}
.lyrs{color:var(--faint);font-size:12px}
.lcur{font:600 9px/1 system-ui;letter-spacing:.08em;color:var(--ok);
  border:1px solid color-mix(in srgb,var(--ok) 45%,transparent);border-radius:8px;padding:2px 7px}
.lstats{display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;font-size:12.5px;color:var(--muted)}
.ls b{font-weight:700;color:var(--ink);font-size:14px}
.abar{display:inline-block;width:52px;height:6px;background:var(--gridline);border-radius:2px;
  overflow:hidden;vertical-align:middle;margin-left:5px}
.abar u{display:block;height:100%;background:var(--ok)}
.att-mid .abar u{background:var(--accent)}
.att-low .abar u{background:var(--warn)}
.lext{display:none;border-top:1px dotted var(--rule-strong);margin-top:11px;padding-top:10px}
.lcard.open .lext{display:block}
.psub{color:var(--muted);font-size:13px;margin-bottom:8px}
.ph{font:600 10px/1.6 system-ui;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);
  margin:10px 0 3px}
.prow{display:flex;gap:8px;align-items:baseline;padding:3px 0;border-bottom:1px dotted var(--rule);
  font-size:13px}
.prow:last-of-type{border-bottom:0}
.pid{flex:none;font-size:11px;color:var(--accent);font-weight:600}
.pd{flex:none;font-size:11px;color:var(--faint)}
.pt{flex:1;min-width:0;color:var(--muted)}
.pv{flex:none;font-weight:700;font-size:12px;color:var(--warn)}
.pmut{color:var(--faint);font-size:12.5px;font-style:italic;margin:2px 0}
@media (min-width:1000px){
  .wrap{max-width:1150px}
  .roster{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
  .roster .lcard{margin:0}
  .big{font-size:52px}
}
@media (min-width:1520px){
  .wrap{max-width:1380px}
  .roster{grid-template-columns:1fr 1fr 1fr}
}
.method{margin-top:40px;padding:28px 0 34px;background:#22201c;color:#e8e3d8;
  --muted:#a89f8f;--faint:#7a7264;--rule:#3a362e;--accent:#c9a35e}
.method h2{margin:0 0 8px;font-size:20px}
.method p{color:var(--muted);max-width:76ch;font-size:13.5px}
.method a{color:var(--accent)}
.foot{padding:24px 0 44px;color:var(--faint);font:12px system-ui}
.foot a{color:var(--muted)}
@media (max-width:640px){.wrap{padding:0 14px}.lstats{gap:12px}
  .prow{flex-wrap:wrap}.pt{flex-basis:100%;order:3}}
</style>
<script>
try{var t=localStorage.getItem('pl-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}
</script>
</head><body>

<header class="mast"><div class="wrap mrow">
  <a class="wordmark" href="./">Public Ledger</a>
  <span class="chip">THE LEGISLATORS</span>
  <nav class="mnav">
    <a href="decisions.html">The decisions</a><a href="county.html">County edition</a>
    <a href="./">City ledger</a>
    <button id="themeBtn" aria-label="Toggle theme">&#9789;</button>
  </nav>
</div></header>

<section class="hero"><div class="wrap">
  <div class="eyebrow">Niagara County Legislature &middot; __Y0__&ndash;__Y1__</div>
  <div class="big">__NLEG__ legislators, on the record</div>
  <p class="lede">Every number below is read from the Legislature&rsquo;s own minutes: who moved
  and seconded each resolution, who cast every no vote, who was recorded absent, and who put
  their name on individual-legislator resolutions. Select a member for their record.</p>
</div></section>

<section><div class="wrap">
  <h2 class="sect">Serving in __Y1__</h2>
  <p class="sectsub">Ordered by activity in the parsed record</p>
  <div class="roster">__CURRENT__</div>
  <h2 class="sect">Earlier members, __Y0__&ndash;</h2>
  <p class="sectsub">Members whose service ended before __Y1__, from the same record</p>
  <div class="roster">__FORMER__</div>
</div></section>

<section class="method"><div class="wrap">
  <h2>How to read these numbers</h2>
  <p>Counts come from the <a href="decisions.html">decisions register</a> &mdash; __TOTAL__
  resolutions parsed from the county&rsquo;s published agendas and minutes, with __VPCT__% of
  votes matched where minutes are machine-readable. &ldquo;Moved&rdquo; and
  &ldquo;seconded&rdquo; reflect the chamber&rsquo;s practice of one member moving the consent
  calendar, which is why the floor leader&rsquo;s count towers. <b>Attendance</b> is the share
  of machine-readable meetings, within the member&rsquo;s own first-to-last active years, where
  the minutes do <i>not</i> record them absent &mdash; scanned or unposted minutes can&rsquo;t
  count against anyone. Names are canonicalized against the roster (OCR variants folded in,
  every fix logged at build time). No party, district, or biography here &mdash; only what the
  record shows.</p>
</div></section>

<footer class="foot"><div class="wrap">
  Public Ledger &middot; The Legislators &middot; built __BUILT__ from documents published by
  Niagara County &middot; <a href="decisions.html">the decisions</a> &middot;
  <a href="county.html">county ledger</a>
</div></footer>

<script>
document.addEventListener('click',function(e){
  var c=e.target.closest('.lcard'); if(!c||e.target.closest('a')) return;
  c.classList.toggle('open');
  c.setAttribute('aria-expanded',c.classList.contains('open'));
});
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ') return;
  var c=e.target.closest('.lcard'); if(!c) return;
  e.preventDefault(); c.classList.toggle('open');
});
document.getElementById('themeBtn').addEventListener('click',function(){
  var cur=document.documentElement.getAttribute('data-theme');
  var next=cur==='dark'?'light':(cur==='light'?'dark':
    (matchMedia('(prefers-color-scheme:dark)').matches?'light':'dark'));
  document.documentElement.setAttribute('data-theme',next);
  try{localStorage.setItem('pl-theme',next);}catch(e2){}
});
</script>
</body></html>"""

import datetime
S = DATA["summary"]
subs = {
    "__Y0__": str(S["years"][0]),
    "__Y1__": str(S["years"][1]),
    "__NLEG__": str(len(profiles)),
    "__CURRENT__": current_cards,
    "__FORMER__": former_cards,
    "__TOTAL__": "{:,}".format(S["total"]),
    "__VPCT__": str(round(100 * S["readable_voted"] / max(1, S["readable"]))),
    "__BUILT__": datetime.date.today().isoformat(),
}
html = HTML
for k, v in subs.items():
    assert k in html, "marker missing: " + k
    html = html.replace(k, v)
out = ROOT / "legislators.html"
out.write_text(html, encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size//1024} KB)")
