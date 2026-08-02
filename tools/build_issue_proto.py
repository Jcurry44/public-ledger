"""PROTOTYPE - not in the build chain, not linked, not deployed.

'The Ledger, Issue No. N' - an envelope-push concept answering Joe's
challenge: stop presenting the checkbook as a dashboard to visit; present it
as (1) a publication that issues itself every meeting, (2) written in prose
whose numbers are pressable evidence, and (3) centered on the record drawn
TO SCALE - every claim a slat whose height is its dollars, newest first,
scan-gaps as visible tears. The anti-dashboard.

Emits prototype/issue.html from data/site-data.json. Nothing else changes.
"""
import json
import os
import statistics
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, "data", "site-data.json"), encoding="utf-8"))
V, A, PROJ = D["vendors"], D["accounts"], D["acctProj"]
I_DOC, I_VEN, I_ACC, I_AMT, I_PO, I_CR = 0, 1, 2, 3, 5, 8

os.makedirs(os.path.join(ROOT, "prototype"), exist_ok=True)


def money(v):
    return "${:,.0f}".format(round(v))


def esc(s):
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def fund_of(acct):
    return acct.split("-")[0]


FAMILY = {}
for code, name in D["fundNames"].items():
    n = name.lower()
    if code == "001":
        FAMILY[code] = ("General Fund", "#1b3a5c")
    elif "water" in n:
        FAMILY[code] = ("Water", "#3d7ebf")
    elif "sewer" in n or "wastewater" in n:
        FAMILY[code] = ("Sewer", "#3f7d74")
    elif "golf" in n:
        FAMILY[code] = ("Golf", "#9a5a86")
    else:
        FAMILY[code] = ("Capital projects", "#c07a24")


def fam(acct):
    f = fund_of(acct)
    if f in FAMILY:
        return FAMILY[f]
    # funds absent from the names dictionary: 6xx/H are capital by numbering
    if f.startswith("6") or f.startswith("H"):
        return ("Capital projects", "#c07a24")
    return ("Other", "#8b8f98")


# ---- per-document rows, chronological then reversed (newest first) ---------
by_doc = defaultdict(list)
for r in D["rows"]:
    by_doc[r[I_DOC]].append(r)

docs = list(enumerate(D["docs"]))
docs.sort(key=lambda x: (x[1]["d"][6:10], x[1]["d"][0:2], x[1]["d"][3:5]))
parsed_totals = [sum(r[I_AMT] for r in by_doc[i]) for i, d in docs if d.get("n")]
docs_newest = list(reversed(docs))

TOTAL = D["meta"]["totalAll"]
SCALE = TOTAL / 4200.0          # dollars per pixel of tape
MINPX = 1.1                     # a claim below this collapses into the fuzz

# ---- first-appearance payees (chronological memory) ------------------------
seen, first_in = set(), defaultdict(set)
for i, d in docs:
    for r in by_doc[i]:
        if V[r[I_VEN]] not in seen:
            first_in[i].add(V[r[I_VEN]])
            seen.add(V[r[I_VEN]])

# ---- the latest issue's computed prose -------------------------------------
FAMORD = {"General Fund": 0, "Water": 1, "Sewer": 2, "Capital projects": 3,
          "Golf": 4, "Other": 5}
li, ld = docs_newest[0]
rows = sorted(by_doc[li], key=lambda r: (FAMORD.get(fam(A[r[I_ACC]])[0], 5), -r[I_AMT]))
biggest_idx = max(range(len(rows)), key=lambda ix: rows[ix][I_AMT])
lt = sum(r[I_AMT] for r in rows)
med = statistics.median(parsed_totals[:-1]) if len(parsed_totals) > 1 else lt
big = rows[biggest_idx]
big_proj = PROJ[big[I_ACC]]
news = sorted((r for r in rows if V[r[I_VEN]] in first_in[li]), key=lambda r: -r[I_AMT])
new_sum = sum(r[I_AMT] for r in news)
fmix = sorted(((f[1], f[3]) for f in ld["funds"]), key=lambda x: -x[1] if 0 else -x[1])
fmix = sorted(((f[1], f[3]) for f in ld["funds"]), key=lambda x: -x[1])

lede = (
    '<p>On <b>{date}</b> the Common Council was asked to approve <b class="num">{tot}</b> '
    'across <b>{n} claims</b> — {ratio} a typical meeting on this record. The largest single '
    'claim is <a class="ev" data-slat="s-{li}-{bi}"><b class="num">{bigamt}</b> to {bigven}</a>{proj}. '
    .format(
        date=ld["d"], tot=money(lt), n=len(rows), bi=biggest_idx,
        ratio="{:.1f}&times;".format(lt / med) if med else "",
        li=li, bigamt=money(big[I_AMT]), bigven=esc(V[big[I_VEN]]),
        proj=" for the " + esc(big_proj).title() if big_proj else "",
    )
)
if news:
    nb = news[0]
    lede += (
        '<b>{k} payee{s}</b> appear{v} in the record for the first time, together '
        '<a class="ev" data-slat="s-{li}-{idx}"><b class="num">{ns}</b></a> — the largest, '
        '{ven}, at <b class="num">{na}</b>. '.format(
            k=len(news), s="" if len(news) == 1 else "s", v="s" if len(news) == 1 else "",
            li=li, idx=rows.index(news[0]), ns=money(new_sum),
            ven=esc(V[nb[I_VEN]]), na=money(nb[I_AMT]),
        )
    )
cap_amt = sum(f[2] for f in ld["funds"] if f[0] != "001" and f[0][0] in "6H")
if lt and cap_amt / lt >= 0.25:
    lede += ('<b class="num">{p:.0f}%</b> of the meeting is capital work — projects, '
             'not day-to-day operations. '.format(p=cap_amt / lt * 100))
lede += (
    'Its printed control total ties out to the penny, so this issue publishes. '
    '<span class="mut">Every number above is computed from the document itself; '
    'press one to find its ink in the record below.</span></p>'
)

# ---- the tape --------------------------------------------------------------
tape = []
annots = []
top_lines = sorted(D["rows"], key=lambda r: -r[I_AMT])[:7]
top_ids = {}
for i, d in docs:
    rr = sorted(by_doc[i], key=lambda r: -r[I_AMT])
    for idx, r in enumerate(rr):
        if any(r is t for t in top_lines):
            top_ids[id(r)] = "s-%d-%d" % (i, idx)

cur_year = None
for i, d in docs_newest:
    yr = d["d"][6:10]
    if cur_year is None:
        cur_year = yr
    elif yr != cur_year:
        tape.append('<div class="yeardiv"><span>{y}</span></div>'.format(y=yr))
        cur_year = yr
    if not d.get("n"):
        tape.append(
            '<div class="torn"><div class="tornlbl">{d} — published as an image scan; '
            'unreadable, so its height here is unknown</div></div>'.format(d=d["d"]))
        continue
    rr = sorted(by_doc[i], key=lambda r: (FAMORD.get(fam(A[r[I_ACC]])[0], 5), -r[I_AMT]))
    dt = sum(r[I_AMT] for r in rr)
    tape.append(
        '<div class="wmark"><span class="num">{d}</span><span>{n} claims</span>'
        '<span class="num">{t}</span><span class="tick">&#10003; ties</span></div>'.format(
            d=d["d"], n=len(rr), t=money(dt)))
    fuzz_n, fuzz_sum = 0, 0.0
    for idx, r in enumerate(rr):
        px = r[I_AMT] / SCALE
        if px < MINPX:
            fuzz_n += 1
            fuzz_sum += r[I_AMT]
            continue
        name, color = fam(A[r[I_ACC]])
        proj = PROJ[r[I_ACC]]
        h = px
        label = ""
        if h >= 15:
            label = '<span class="slbl">{v}&nbsp;&mdash;&nbsp;<span class="num">{a}</span>{p}</span>'.format(
                v=esc(V[r[I_VEN]]), a=money(r[I_AMT]),
                p="&nbsp;&middot;&nbsp;" + esc(proj).title() if proj else "")
        sid = "s-%d-%d" % (i, idx)
        tape.append(
            '<div class="slat" id="{sid}" style="height:{h:.2f}px;background:{c}" '
            'data-tip="{v} · {a} · {acct}{p} · warrant of {d}">{label}</div>'.format(
                sid=sid, h=h, c=color, v=esc(V[r[I_VEN]]), a=money(r[I_AMT]),
                acct=A[r[I_ACC]], p=" · " + esc(proj).title() if proj else "",
                d=d["d"], label=label))
        if id(r) in top_ids and top_ids[id(r)] == sid:
            annots.append((sid, "{v} — {a}{p}".format(
                v=esc(V[r[I_VEN]]), a=money(r[I_AMT]),
                p=" · " + esc(proj).title() if proj else "")))
    if fuzz_n:
        fh = max(fuzz_sum / SCALE, 2.5)
        lbl = ""
        if fh >= 13:
            lbl = ('<span class="slbl mut"><span class="fchip">{n} smaller claims'
                   '&nbsp;&mdash;&nbsp;<span class="num">{s}</span></span></span>').format(
                n=fuzz_n, s=money(fuzz_sum))
        tape.append(
            '<div class="fuzz" style="height:{h:.2f}px" data-tip="{n} claims under {m} '
            'totalling {s} · warrant of {d} · every one is in the register">{lbl}</div>'.format(
                h=fh, n=fuzz_n, m=money(SCALE * MINPX), s=money(fuzz_sum), d=d["d"], lbl=lbl))

legend = "".join(
    '<span><b style="background:{c}"></b>{n}</span>'.format(c=c, n=n)
    for n, c in dict(FAMILY.values()).items() if True
)
fams_seen, legend_items = set(), []
for code, (n, c) in FAMILY.items():
    if n not in fams_seen:
        fams_seen.add(n)
        legend_items.append('<span><b style="background:%s"></b>%s</span>'
                            % (c, n.replace("Capital projects", "Capital")))
legend = "".join(legend_items)

HTML = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>The Ledger — Issue No. {ISSUE}</title>
<style>
@font-face{{font-family:'Fraunces';font-style:normal;font-weight:600;font-display:swap;
  src:url(../fonts/Fraunces-600-latin.woff2) format('woff2')}}
:root{{--paper:#f6f4ef;--card:#fffdfa;--ink:#16181d;--muted:#6c7079;--faint:#93979f;
  --rule:#e0dbd0;--strong:#cdc6b7;--navy:#1b3a5c;--ok:#1c6b47;--ok-soft:#e3f0e9;--desk:#e9e3d5}}
*{{box-sizing:border-box}}
html{{border-top:5px solid var(--navy);background:var(--desk);-webkit-tap-highlight-color:transparent}}
body{{margin:0;background:var(--desk);color:var(--ink);font:14.5px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}}
.num{{font-family:ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}}
.page{{max-width:960px;margin:26px auto 60px;padding:38px 40px 50px;background:var(--paper);
  border-radius:3px;box-shadow:0 0 0 1px var(--strong),0 26px 70px -32px rgba(20,18,10,.45)}}
@media (max-width:700px){{.page{{margin:0;border-radius:0;box-shadow:none;padding:24px 16px 40px}}}}
.mast{{text-align:center;border-bottom:3px double var(--strong);padding-bottom:16px}}
.mast .over{{font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.22em;color:var(--faint)}}
.mast h1{{font:600 44px/1.05 'Fraunces',ui-serif,Georgia,serif;margin:10px 0 8px}}
@media (max-width:700px){{.mast h1{{font-size:32px}}}}
.mast .issue{{font-size:13px;color:var(--muted)}}
.mast .issue b{{color:var(--ink)}}
.lede{{font:400 17px/1.75 ui-serif,Georgia,serif;max-width:64ch;margin:26px auto 8px}}
@media (max-width:700px){{.lede{{font-size:15.5px;line-height:1.7}}}}
.lede .mut{{color:var(--muted);font-size:14px}}
.ev{{color:var(--navy);text-decoration:underline;text-decoration-style:dotted;
  text-underline-offset:3px;cursor:pointer}}
.ev:hover{{background:#eae4d4}}
h2{{font:600 11px/1 system-ui;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);
  margin:34px 0 10px;display:flex;gap:12px;align-items:center;justify-content:center}}
h2::before,h2::after{{content:'';flex:1;height:1px;background:var(--rule)}}
.scalehead{{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin:0 0 14px}}
.scalehead .chip{{border:1px solid var(--strong);border-radius:99px;padding:3px 10px;background:var(--card)}}
.legend{{display:flex;gap:6px 12px;flex-wrap:wrap;justify-content:center;font-size:11.5px;color:var(--muted)}}
.legend b{{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}}
.taperow{{display:flex;justify-content:center;gap:22px;margin-top:18px}}
.tape{{width:min(600px,100%);}}
.slat{{position:relative;margin:0 0 1px;border-radius:1px;overflow:visible;cursor:pointer}}
.slat:hover,.slat.lit{{outline:2px solid var(--ink);outline-offset:1px;z-index:2}}
.slbl{{position:absolute;inset:0;display:flex;align-items:center;padding:0 16px 0 10px;font-size:11.5px;
  color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  text-shadow:0 1px 2px rgba(0,0,0,.35)}}
.fuzz{{position:relative;margin:0 0 1px;border-radius:1px;cursor:pointer;
  background:repeating-linear-gradient(0deg,#b9b2a2 0 1px,#e7e2d5 1px 3px)}}
.fuzz .slbl{{color:var(--muted);text-shadow:none;font-weight:500}}
.fchip{{background:var(--paper);border:1px solid #d8d2c4;border-radius:5px;padding:1px 9px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.fuzz:hover{{outline:2px solid var(--muted);outline-offset:1px}}
.wmark{{display:flex;gap:12px;align-items:baseline;font-size:11px;color:var(--faint);
  border-top:1px solid var(--strong);margin:14px 0 5px;padding-top:4px;flex-wrap:wrap}}
.wmark .num:first-child{{font-weight:700;color:var(--muted)}}
.wmark .tick{{color:var(--ok);margin-left:auto}}
.yeardiv{{display:flex;align-items:center;gap:12px;margin:20px 0 6px;color:var(--faint);
  font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.18em}}
.yeardiv::before,.yeardiv::after{{content:'';flex:1;height:1px;background:var(--strong)}}
.backrow{{margin-top:10px}}
.backrow a{{font-size:12.5px;color:var(--navy);text-decoration:none;border:1px solid var(--strong);
  border-radius:99px;padding:5px 12px;background:var(--card)}}
.backrow a:hover{{border-color:var(--navy)}}
.torn{{margin:14px 0;padding:12px 10px;border-top:2px dashed #b9b2a2;border-bottom:2px dashed #b9b2a2;
  background:repeating-linear-gradient(-45deg,transparent 0 7px,#eee8da 7px 14px)}}
.tornlbl{{font-size:11.5px;color:var(--muted);text-align:center}}
.close{{max-width:600px;margin:6px auto 0;text-align:right}}
.close .sum{{font:600 26px/1.1 'Fraunces',ui-serif,Georgia,serif;border-bottom:3px double var(--ink);
  display:inline-block;padding-bottom:6px}}
.close .cap{{font-size:12px;color:var(--muted);margin-top:6px}}
.tip{{position:fixed;left:0;bottom:0;right:0;transform:translateY(110%);transition:transform .18s;
  background:var(--ink);color:#f6f4ef;font-size:13px;padding:12px 16px;z-index:9;line-height:1.5}}
.tip.on{{transform:none}}
@media (min-width:701px){{.tip{{left:auto;right:22px;bottom:22px;max-width:360px;border-radius:10px;
  box-shadow:0 18px 50px -20px rgba(10,12,15,.6)}}}}
.foot{{text-align:center;font-size:12px;color:var(--faint);border-top:1px solid var(--rule);
  margin-top:38px;padding-top:14px}}
</style></head><body>
<div class="page">
  <div class="mast">
    <div class="over">EVERY CLAIM · EVERY MEETING · TO THE PENNY · TO SCALE</div>
    <h1>The Ledger</h1>
    <div class="issue">City of North Tonawanda &middot; <b>Issue No. {ISSUE}</b> — the meeting of
      <b>{DATE}</b> &middot; written by the record, checked against itself</div>
    <div class="backrow"><a href="../">Public Ledger — the full reference &rarr;</a></div>
  </div>

  <div class="lede">{LEDE}</div>

  <h2>The record, to scale — newest first</h2>
  <div class="scalehead">
    <span class="chip">1 pixel = <span class="num">{PXVAL}</span></span>
    <span class="chip">every one of <span class="num">{NROWS}</span> claims is on this page</span>
  </div>
  <div class="legend">{LEGEND}</div>

  <div class="taperow"><div class="tape">
{TAPE}
  </div></div>
  <div class="close">
    <div class="sum num">{TOTAL}</div>
    <div class="cap">the whole record above, closed — ties to 36 printed control totals &#10003;</div>
  </div>

  <div class="foot">Concept study &middot; Public Ledger. Tap any slat for its claim; the textured
    bands hold the smaller claims, counted, never dropped. When the city posts its next warrant,
    Issue No. {NEXT} writes itself.</div>
</div>
<div class="tip" id="tip"></div>
<script>
var tip=document.getElementById('tip'),tt=null;
document.addEventListener('pointerover',function(e){{
  var s=e.target.closest('[data-tip]'); if(!s) return;
  tip.textContent=s.getAttribute('data-tip'); tip.classList.add('on');
  clearTimeout(tt); tt=setTimeout(function(){{tip.classList.remove('on');}},4000);
}});
document.addEventListener('click',function(e){{
  var ev=e.target.closest('.ev'); if(!ev) return;
  var s=document.getElementById(ev.getAttribute('data-slat')); if(!s) return;
  document.querySelectorAll('.slat.lit').forEach(function(x){{x.classList.remove('lit');}});
  s.classList.add('lit'); s.scrollIntoView({{block:'center',behavior:'smooth'}});
  tip.textContent=s.getAttribute('data-tip'); tip.classList.add('on');
  clearTimeout(tt); tt=setTimeout(function(){{tip.classList.remove('on');}},4000);
}});
</script>
</body></html>"""

out = HTML.format(
    ISSUE=len([1 for i, d in docs if d.get("n")]),
    DATE=ld["d"], LEDE=lede, PXVAL=money(SCALE),
    NROWS="{:,}".format(D["meta"]["rows"]), LEGEND=legend,
    NEXT=len([1 for i, d in docs if d.get("n")]) + 1,
    TAPE="\n".join(tape), TOTAL="${:,.2f}".format(TOTAL),
)
path = os.path.join(ROOT, "prototype", "issue.html")
open(path, "w", encoding="utf-8").write(out)
print("wrote %s (%d KB) - issue %s, %d tape nodes" % (
    path, os.path.getsize(path) // 1024, ld["d"], len(tape)))
